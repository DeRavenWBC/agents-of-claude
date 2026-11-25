#!/usr/bin/env node
// Agents of Claude — which world this machine plays in.
//
// A world is one game page. Players of the first world need no setup. Players of another organization's world run
// /agents-of-claude:join once, with the page link and clock offset their host gave them; it is kept in
// ~/.claude/agents-of-claude/config.json and read by the XP hook (day boundaries), the sync and the coach.
//
//   node config.mjs --show                       print the current world
//   node config.mjs --join <page link> [offset]  point this machine at a world (offset like +01:00; default +02:00)
//   node config.mjs --hosted <page link>         remember the page a host published (for later updates)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = process.env.AOC_DIR || path.join(os.homedir(), '.claude', 'agents-of-claude');
const FILE = path.join(DIR, 'config.json');
export const DEFAULT_GAME = 'https://claude.ai/artifact/KVff7XMzGBmd7S7h4UjdTy', DEFAULT_TZ = '+02:00';
export const validGame = (u) => typeof u === 'string' && /^https:\/\/claude\.ai\/(code\/)?artifact\/[A-Za-z0-9_-]{8,64}$/.test(u);
export const validTz = (t) => typeof t === 'string' && /^[+-](0\d|1[0-4]):00$/.test(t);
// The fixed-offset zone name for an offset (the sign is reversed in these names: +02:00 is Etc/GMT-2).
export const tzName = (tz) => { const h = +tz.slice(1, 3); return h === 0 ? 'Etc/GMT' : `Etc/GMT${tz[0] === '+' ? '-' : '+'}${h}`; };

export function readConfig() {
  let c = {}; try { c = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch {}
  return { game: validGame(c.game) ? c.game : DEFAULT_GAME, tz: validTz(c.tz) ? c.tz : DEFAULT_TZ, ...(validGame(c.hosted) ? { hosted: c.hosted } : {}), joined: validGame(c.game) };
}
function write(patch) {
  let c = {}; try { c = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch {}
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp-${process.pid}`; fs.writeFileSync(tmp, JSON.stringify({ ...c, ...patch }, null, 2) + '\n'); fs.renameSync(tmp, FILE);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const a = process.argv.slice(2), out = (o) => console.log(JSON.stringify(o, null, 2));
  if (a[0] === '--join') {
    const url = (a[1] || '').replace(/[?#].*$/, ''), tz = a[2] || DEFAULT_TZ;
    if (!validGame(url)) out({ ok: false, reason: 'That is not a game page link. It looks like https://claude.ai/artifact/… (ask your world\'s host for it).' });
    else if (!validTz(tz)) out({ ok: false, reason: 'The clock offset must be whole hours, like +01:00 or -05:00 (ask your world\'s host for it).' });
    else {
      write({ game: url, tz });
      // A different world has seen none of this machine's XP: forget the last sync so the next one sends it all.
      try { fs.rmSync(path.join(DIR, 'sync-state.json'), { force: true }); fs.rmSync(path.join(DIR, 'cache'), { recursive: true, force: true }); } catch {}
      out({ ok: true, game: url, tz, next: 'Run /agents-of-claude:quest-sync to send your XP to this world. If you use the desktop helper, quit and reopen the Claude desktop app.' });
    }
  } else if (a[0] === '--hosted') {
    const url = (a[1] || '').replace(/[?#].*$/, '');
    if (!validGame(url)) out({ ok: false, reason: 'That is not a game page link.' }); else { write({ hosted: url }); out({ ok: true, hosted: url }); }
  } else out({ ok: true, ...readConfig(), file: FILE });
}
