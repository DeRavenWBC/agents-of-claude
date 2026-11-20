// Shared ledger reading: chain verification, per-day totals, sync state.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GENESIS, lineHash, sastDay } from './xp-hook.mjs';

export const DIR = process.env.AOC_DIR || path.join(os.homedir(), '.claude', 'agents-of-claude');
export const LEDGER = path.join(DIR, 'ledger.jsonl');
export const SYNC_STATE = path.join(DIR, 'sync-state.json');
export const WINDOW_DAYS = 14;
// This plugin's version, sent with every synced day so the game can tell players when to update.
// In the plugin it reads the manifest; the desktop helper's copy reads the version.json written beside it.
export const PLUGIN_VERSION = (() => {
  for (const f of ['../.claude-plugin/plugin.json', './version.json']) { try { const v = JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8')).version; if (v) return v; } catch {} }
  return null;
})();

export function readLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map((s, i) => {
    try { return JSON.parse(s); } catch { return { bad: true, lineNo: i + 1 }; }
  });
}

export function verify(lines) {
  let prev = GENESIS, seq = 0;
  for (const [i, l] of lines.entries()) {
    if (l.bad || l.prev !== prev || l.seq !== seq + 1 || lineHash(prev, l) !== l.h) return { ok: false, brokenAt: i + 1 };
    prev = l.h; seq = l.seq;
  }
  return { ok: true, brokenAt: null };
}

// Per-day documents for the last 14 SAST days, shaped exactly as the game stores them.
export function buildDays(now = new Date()) {
  const lines = readLedger();
  const chain = verify(lines);
  const today = sastDay(now);
  const oldest = sastDay(new Date(now.getTime() - (WINDOW_DAYS - 1) * 86_400_000));
  const syncedAt = now.toISOString();
  const days = new Map();
  for (const l of lines) {
    if (l.bad || l.day < oldest || l.day > today) continue;
    const d = days.get(l.day) ?? { day: l.day, raw: 0, events: 0, counts: {}, chainHead: null };
    d.raw += l.xp; d.events += 1;
    d.counts[l.kind] = (d.counts[l.kind] || 0) + 1;
    d.chainHead = l.h;
    days.set(l.day, d);
  }
  const docs = [...days.values()].sort((a, b) => a.day.localeCompare(b.day))
    .map(d => ({ ...d, chainOk: chain.ok, syncedAt, ledgerVersion: 1, ...(PLUGIN_VERSION ? { plugin: PLUGIN_VERSION } : {}) }));
  const lastSeq = lines.filter(l => !l.bad).at(-1)?.seq ?? 0;
  const lastEvent = [...lines].reverse().find(l => !l.bad) || null;
  // Claude Code sessions on this machine: working (event in the last 3 min) and open recently (30 min).
  let sessions = { working: 0, recent: 0 };
  try {
    const s = JSON.parse(fs.readFileSync(path.join(path.dirname(SYNC_STATE), 'sessions.json'), 'utf8')), t = now.getTime();
    for (const v of Object.values(s)) { if (v.ended) continue; if (t - v.at < 180_000) sessions.working++; else if (t - v.at < 1_800_000) sessions.recent++; }
  } catch {}
  return { docs, chain, ledgerLines: lines.length, lastSeq, lastEvent: lastEvent && { ts: lastEvent.ts, kind: lastEvent.kind }, sessions };
}

export function readSyncState() {
  try { return JSON.parse(fs.readFileSync(SYNC_STATE, 'utf8')); } catch { return {}; }
}

export function updateSyncState(patch) {
  const s = { ...readSyncState(), ...patch };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(SYNC_STATE, JSON.stringify(s, null, 2));
  return s;
}
