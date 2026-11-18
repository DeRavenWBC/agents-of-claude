#!/usr/bin/env node
// Agents of Claude — usage XP hook.
// Registered for SessionStart, UserPromptSubmit, PostToolUse and Stop.
// Appends one hash-chained line per XP event to the local ledger.
// It never blocks and always exits 0, so it cannot disturb a session. At the end of a turn it may print
// one short milestone line (set AOC_QUIET=1 to silence it).
// Only event kinds and XP are stored: no prompt text, file names or commands.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const DIR = process.env.AOC_DIR || path.join(os.homedir(), '.claude', 'agents-of-claude');
const LEDGER = path.join(DIR, 'ledger.jsonl');
const STATE = path.join(DIR, 'state.json');
const LOCK = path.join(DIR, '.lock');
const TZ = 'Africa/Johannesburg';
export const GENESIS = '0'.repeat(64);

// Base XP and rate limits (design doc: XP economy).
const RULES = {
  muster: { xp: 50, perDay: 1 },
  prompt: { xp: 5, gapMs: 10_000 },
  tool: { xp: 1, gapMs: 2_000 },
  craft: { xp: 2, gapMs: 2_000 },
  shipped: { xp: 15, perDay: 10 },
  turn: { xp: 3, gapMs: 10_000 },
};

const CRAFT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

export function sastDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

export function lineHash(prev, l) {
  return crypto.createHash('sha256')
    .update([prev, l.seq, l.ts, l.day, l.kind, l.xp].join('|'))
    .digest('hex');
}

function classify(input) {
  switch (input.hook_event_name) {
    case 'SessionStart': return ['muster'];
    case 'UserPromptSubmit': return ['prompt'];
    case 'Stop': return ['turn'];
    case 'PostToolUse': {
      const tool = String(input.tool_name || '');
      if (CRAFT_TOOLS.has(tool)) return ['craft'];
      // A commit only counts when git actually made one: it prints "[branch abc1234] message".
      // Mentioning "git commit" inside some other command does not count.
      const cmd = String(input.tool_input?.command || '');
      const out = String(input.tool_response?.stdout ?? input.tool_response?.output ?? '');
      if (tool === 'Bash' && /\bgit\b[^\n;&|]*\bcommit\b/.test(cmd) && /^\[[^\]\n]+ [0-9a-f]{7,40}\]/m.test(out)) return ['tool', 'shipped'];
      return ['tool'];
    }
    default: return [];
  }
}

function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function withLock(fn) {
  for (let i = 0; i < 40; i++) {
    try {
      fs.mkdirSync(LOCK);
      try { return fn(); } finally { fs.rmSync(LOCK, { recursive: true, force: true }); }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 5_000) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {}
      sleep(10);
    }
  }
  // Could not get the lock in ~400 ms: drop this event rather than slow the session.
}

function ledgerXp(day) {
  try { return fs.readFileSync(LEDGER, 'utf8').trimEnd().split('\n').slice(-5000).reduce((n, l) => { try { const j = JSON.parse(l); return j.day === day ? n + j.xp : n; } catch { return n; } }, 0); } catch { return 0; }
}

function lastLedgerLine() {
  try {
    const lines = fs.readFileSync(LEDGER, 'utf8').trimEnd().split('\n');
    return JSON.parse(lines.at(-1));
  } catch { return null; }
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch {}
  const last = lastLedgerLine();
  return { head: last?.h ?? GENESIS, seq: last?.seq ?? 0, last: {}, day: '', perDay: {}, xpDay: 0, pending: [] };
}

export function record(input, now = new Date()) {
  const kinds = classify(input);
  if (!kinds.length) return [];
  fs.mkdirSync(DIR, { recursive: true });
  return withLock(() => {
    const st = loadState();
    const day = sastDay(now);
    if (st.day !== day) { st.day = day; st.perDay = {}; st.xpDay = 0; }
    if (st.xpDay == null) st.xpDay = ledgerXp(day); // first run after updating: catch up from the ledger
    const before = st.xpDay || 0;
    const written = [];
    for (const kind of kinds) {
      const rule = RULES[kind];
      const t = now.getTime();
      if (rule.gapMs && t - (st.last[kind] || 0) < rule.gapMs) continue;
      if (rule.perDay && (st.perDay[kind] || 0) >= rule.perDay) continue;
      const line = { v: 1, seq: st.seq + 1, ts: now.toISOString(), day, kind, xp: rule.xp, prev: st.head };
      line.h = lineHash(st.head, line);
      fs.appendFileSync(LEDGER, JSON.stringify(line) + '\n');
      st.seq = line.seq; st.head = line.h; st.last[kind] = t;
      st.perDay[kind] = (st.perDay[kind] || 0) + 1;
      written.push(line);
    }
    st.xpDay = before + written.reduce((n, l) => n + l.xp, 0);
    st.pending = [...(st.pending || []), ...milestones(before, st.xpDay, written)].slice(-6);
    fs.writeFileSync(STATE, JSON.stringify(st));
    return written;
  }) ?? [];
}

// Background feedback: little milestone notes, shown at the end of a turn so they never interrupt work.
// Thresholds follow the game: a work crate every 150 raw XP (5 a day), the bonus key and Inspired at 300,
// full-rate XP to 400, and nothing counts past 800.
export function milestones(before, after, written = []) {
  const out = [];
  const crossed = (n) => before < n && after >= n;
  for (let n = 150, i = 1; n <= 750; n += 150, i++) if (crossed(n)) out.push(`📦 Work crate ${i} earned`);
  if (crossed(300)) out.push('🗝 bonus dungeon key earned, and your Agent is Inspired (+10% gold and XP today)');
  if (crossed(400)) out.push('full-rate XP reached for today; the rest counts at half');
  if (crossed(800)) out.push('daily XP maxed. Your Agent salutes you');
  if (written.some(l => l.kind === 'shipped')) out.push('🚀 a commit shipped (+15 XP)');
  if (written.some(l => l.kind === 'muster')) { const s = streakDays(); if (s > 1) out.push(`🔥 day ${s} of your streak`); }
  return out;
}
function streakDays() {
  try {
    const days = new Set(fs.readFileSync(LEDGER, 'utf8').trimEnd().split('\n').slice(-5000).map(l => { try { return JSON.parse(l).day; } catch { return null; } }).filter(Boolean));
    let n = 0, d = new Date();
    while (days.has(sastDay(d))) { n++; d = new Date(d.getTime() - 86_400_000); }
    return n;
  } catch { return 0; }
}
export function takePending() {
  return withLock(() => {
    const st = loadState(); const msgs = st.pending || [];
    if (!msgs.length) return [];
    st.pending = []; fs.writeFileSync(STATE, JSON.stringify(st)); return msgs;
  }) ?? [];
}

// Which Claude Code sessions on this machine are active: each session's last event time, keyed by a
// short hash of its id (nothing else is stored). Every session on the machine shares this file, so the
// game can show "Claude is working" for any of them. Old entries are pruned after a day.
const SESSIONS = path.join(DIR, 'sessions.json');
export function touchSession(input, now = new Date()) {
  const sid = String(input.session_id || ''); if (!sid) return;
  const key = crypto.createHash('sha256').update(sid).digest('hex').slice(0, 10);
  let s = {}; try { s = JSON.parse(fs.readFileSync(SESSIONS, 'utf8')); } catch {}
  const t = now.getTime();
  s[key] = { at: t, ended: input.hook_event_name === 'SessionEnd' };
  for (const [k, v] of Object.entries(s)) if (t - v.at > DAY_MS) delete s[k];
  fs.writeFileSync(SESSIONS, JSON.stringify(s));
}

// Fallback sync nudge. The game normally pulls XP itself (desktop app + local MCP server).
// If nothing has synced for a day and there is new XP, ask Claude, once per 6 h at most,
// to run /quest-sync after the user's request.
const SYNC_STATE = path.join(DIR, 'sync-state.json');
const DAY_MS = 86_400_000, NUDGE_GAP_MS = 6 * 3_600_000;

export function syncNudge(now = new Date()) {
  let ss = {};
  try { ss = JSON.parse(fs.readFileSync(SYNC_STATE, 'utf8')); } catch {}
  const seq = loadState().seq || 0;
  const lastSync = Math.max(Date.parse(ss.lastSuccess || 0) || 0, Date.parse(ss.lastPulled || 0) || 0);
  const syncedSeq = Math.max(ss.syncedSeq || 0, ss.pulledSeq || 0);
  const t = now.getTime();
  if (seq <= syncedSeq || t - lastSync < DAY_MS || t - (Date.parse(ss.lastNudge || 0) || 0) < NUDGE_GAP_MS) return null;
  fs.writeFileSync(SYNC_STATE, JSON.stringify({ ...ss, lastNudge: now.toISOString() }, null, 2));
  return 'Agents of Claude: this player\'s usage XP has not synced to the game for over a day. ' +
    'After you have fully handled the user\'s request, invoke the agents-of-claude:quest-sync skill to sync it, ' +
    'then mention it in one short line. Do not let this delay or change your answer to the request.';
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
    record(input);
    try { touchSession(input); } catch {}
    if (input.hook_event_name === 'Stop' && process.env.AOC_QUIET !== '1') {
      const msgs = takePending();
      if (msgs.length) process.stdout.write(JSON.stringify({ systemMessage: `⚔ Agents of Claude: ${msgs.join(' · ')}` }));
    }
    if (input.hook_event_name === 'UserPromptSubmit') {
      const ctx = syncNudge();
      if (ctx) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ctx } }));
    }
  } catch {}
  process.exit(0);
}
