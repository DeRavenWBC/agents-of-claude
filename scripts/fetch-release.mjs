#!/usr/bin/env node
// Agents of Claude — world releases for hosts.
//   node fetch-release.mjs --check [<your world's build>]   what the newest release is, and whether it is newer
//   node fetch-release.mjs --get <folder>                    download the newest release into <folder> and unpack it
//
// Releases are zips in a public repository (default DeRavenWBC/agents-of-claude-releases; set AOC_RELEASES=owner/repo
// to use a fork). `latest.json` there names the newest build, its zip and the zip's SHA-256; a download that does not
// match is deleted, not unpacked. Nothing is published or run: the host command checks the unpacked bundle against
// its own manifest (verify-bundle.mjs) before anything goes live.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = /^[\w.-]+\/[\w.-]+$/.test(process.env.AOC_RELEASES || '') ? process.env.AOC_RELEASES : 'DeRavenWBC/agents-of-claude-releases';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const out = (o) => { console.log(JSON.stringify(o, null, 2)); process.exit(0); };
const get = async (url) => { const r = await fetch(url, { headers: { 'user-agent': 'agents-of-claude-plugin' } }); if (!r.ok) throw new Error(`${r.status} for ${url}`); return r; };

async function latest() {
  const j = await (await get(RAW + 'latest.json')).json();
  if (!Number.isInteger(j?.build) || typeof j.zip !== 'string' || !/^releases\/[\w.-]+\.zip$/.test(j.zip) || !/^[0-9a-f]{64}$/.test(j.sha256 || '')) throw new Error('latest.json is not in the expected form');
  return j;
}
const a = process.argv.slice(2);
try {
  if (a[0] === '--check') {
    const j = await latest(), have = a[1] != null ? Number(a[1]) : null;
    out({ ok: true, repo: REPO, latest: j.build, at: j.at || null, notes: j.notes || null, minPlugin: j.minPlugin || null, ...(Number.isFinite(have) ? { yours: have, newer: j.build > have } : {}) });
  }
  if (a[0] === '--get') {
    const dest = path.resolve(a[1] || '.'), j = await latest();
    fs.mkdirSync(dest, { recursive: true });
    const buf = Buffer.from(await (await get(RAW + j.zip)).arrayBuffer()), sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (sha !== j.sha256) out({ ok: false, reason: 'The download does not match the checksum in latest.json, so it was not unpacked.' });
    const zip = path.join(dest, path.basename(j.zip)); fs.writeFileSync(zip, buf);
    const name = path.basename(j.zip, '.zip'), folder = path.join(dest, name);
    fs.rmSync(folder, { recursive: true, force: true });
    try { execFileSync('tar', ['-xf', zip, '-C', dest], { stdio: 'ignore' }); } catch { execFileSync('unzip', ['-q', '-o', zip, '-d', dest], { stdio: 'ignore' }); }
    fs.rmSync(zip, { force: true });
    if (!fs.existsSync(path.join(folder, 'MANIFEST.json'))) out({ ok: false, reason: `The release did not unpack to ${folder}.` });
    out({ ok: true, build: j.build, bundle: folder, next: `Check it with verify-bundle.mjs "${folder}"` });
  }
  out({ ok: false, reason: 'Use --check [build] or --get <folder>.' });
} catch (e) { out({ ok: false, reason: `Could not reach the releases (${String(e.message || e).slice(0, 160)}).` }); }
