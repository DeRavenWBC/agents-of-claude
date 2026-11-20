#!/usr/bin/env node
// Agents of Claude — install the desktop helper into the Claude desktop app.
//
// The helper is a tiny local MCP server (mcp-server.mjs) that lets the game page, opened in the Claude
// desktop app, read this machine's daily XP totals and Claude's working/idle status: automatic sync.
// This script copies the helper to ~/.claude/agents-of-claude/helper (a path that survives plugin
// updates) and adds one entry, "agents-of-claude", to the desktop app's claude_desktop_config.json.
// It backs the config up first and changes nothing else in it.
//
//   node install-helper.mjs              install or update
//   node install-helper.mjs --uninstall  remove the entry (and the copied files)
//   node install-helper.mjs --check      report whether it is installed

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.env.AOC_DIR || path.join(os.homedir(), '.claude', 'agents-of-claude');
const DEST = path.join(DIR, 'helper');
const FILES = ['mcp-server.mjs', 'days.mjs', 'xp-hook.mjs'];
const NAME = 'agents-of-claude';

function configPath() {
  if (process.env.AOC_DESKTOP_CONFIG) return process.env.AOC_DESKTOP_CONFIG; // for testing
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

const out = (o) => { console.log(JSON.stringify(o, null, 2)); };
const cfgFile = configPath();
const mode = process.argv.includes('--uninstall') ? 'uninstall' : process.argv.includes('--check') ? 'check' : 'install';

if (!fs.existsSync(path.dirname(cfgFile))) {
  out({ ok: false, reason: 'The Claude desktop app does not seem to be installed on this machine (no config folder).', config: cfgFile });
  process.exit(0);
}
let cfg = {};
if (fs.existsSync(cfgFile)) {
  try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8') || '{}'); }
  catch { out({ ok: false, reason: 'claude_desktop_config.json is not valid JSON, so it was left alone. Fix or remove it, then run this again.', config: cfgFile }); process.exit(0); }
}
const current = cfg.mcpServers?.[NAME] || null;

if (mode === 'check') {
  out({ ok: true, installed: !!current, entry: current, filesPresent: FILES.every(f => fs.existsSync(path.join(DEST, f))), config: cfgFile });
  process.exit(0);
}

// Back up before every change (timestamped), then write atomically: a crash can never leave a half-written config.
const save = () => {
  let backup = null;
  if (fs.existsSync(cfgFile)) { backup = `${cfgFile}.aoc-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`; fs.copyFileSync(cfgFile, backup); }
  const tmp = `${cfgFile}.aoc-tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, cfgFile);
  return backup;
};

if (mode === 'uninstall') {
  if (current) { delete cfg.mcpServers[NAME]; save(); }
  fs.rmSync(DEST, { recursive: true, force: true });
  out({ ok: true, removed: !!current, config: cfgFile, next: 'Quit and reopen the Claude desktop app.' });
  process.exit(0);
}

fs.mkdirSync(DEST, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(HERE, f), path.join(DEST, f));
// The copy's version, so it can report it and the plugin can refresh it after an update (xp-hook refreshHelper).
try { fs.writeFileSync(path.join(DEST, 'version.json'), JSON.stringify({ version: JSON.parse(fs.readFileSync(path.join(HERE, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version })); } catch {}
// Prefer the `node` on PATH (e.g. /opt/homebrew/bin/node): a versioned install path breaks when Node upgrades.
const nodeBin = (() => { try { const p = execSync(process.platform === 'win32' ? 'where node' : 'command -v node', { encoding: 'utf8' }).split(/\r?\n/)[0].trim(); return p && fs.existsSync(p) ? p : process.execPath; } catch { return process.execPath; } })();
const entry = { command: nodeBin, args: [path.join(DEST, 'mcp-server.mjs')] };
const changed = JSON.stringify(current) !== JSON.stringify(entry);
if (changed) { cfg.mcpServers = { ...(cfg.mcpServers || {}), [NAME]: entry }; }
const backup = changed ? save() : null;
out({ ok: true, updatedConfig: changed, entry, backup, config: cfgFile,
  next: changed ? 'Quit and reopen the Claude desktop app, then open the game there. Your XP syncs on its own from now on.' : 'Already installed; the helper files were refreshed.' });
