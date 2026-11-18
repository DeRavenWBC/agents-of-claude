#!/usr/bin/env node
// Agents of Claude — a one-line status for Claude Code's status line.
// Reads only local files: today's XP from the hook's state, and the Agent summary cached by
// /agents-of-claude:quest-sync. Never touches the network.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = process.env.AOC_DIR || path.join(os.homedir(), '.claude', 'agents-of-claude');
const TZ = 'Africa/Johannesburg';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
function findSummary(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { const s = findSummary(p); if (s) return s; }
      else if (e.name === 'progress.json') { const j = read(p); return j?.summary || j?.data?.summary || null; }
    }
  } catch {}
  return null;
}
try { fs.readFileSync(0); } catch {} // Claude Code passes session JSON on stdin; not needed here

const st = read(path.join(DIR, 'state.json')) || {};
const xp = st.day === today ? st.xpDay || 0 : 0;
const sum = findSummary(path.join(DIR, 'cache'));
const parts = [];
if (sum?.name) parts.push(`⚔ ${sum.name} Lv ${sum.level}`); else parts.push('⚔ Agents of Claude');
if (sum?.doing && sum.back) {
  const left = sum.back - Date.now();
  parts.push(left > 0 ? `${sum.doing}, back ${new Date(sum.back).toLocaleTimeString('en-ZA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}` : `${sum.doing}: ready to claim`);
}
parts.push(`+${xp} XP today${xp >= 800 ? ' (maxed)' : xp >= 300 ? ' · Inspired' : ''}`);
const nextCrate = Math.min(750, (Math.floor(xp / 150) + 1) * 150);
if (xp < 750) parts.push(`next crate at ${nextCrate}`);
process.stdout.write(parts.join(' · '));
