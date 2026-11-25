#!/usr/bin/env node
// Agents of Claude — check a world bundle before it is published.
//   node verify-bundle.mjs <bundle folder>
// Confirms every file matches the SHA-256 in MANIFEST.json and nothing extra is in the folder, then prints what to
// publish: the page, the engine files, the permission set, the build and the world's clock. Publishes nothing itself.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.resolve(process.argv[2] || '.');
const out = (o) => { console.log(JSON.stringify(o, null, 2)); process.exit(0); };
let man; try { man = JSON.parse(fs.readFileSync(path.join(dir, 'MANIFEST.json'), 'utf8')); } catch { out({ ok: false, reason: `No readable MANIFEST.json in ${dir}. Is this a world bundle?` }); }
const found = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isSymbolicLink()) out({ ok: false, reason: `${path.relative(dir, p)} is a link, which a bundle never contains.` }); if (e.isDirectory()) walk(p); else found.push(path.relative(dir, p)); } };
walk(dir);
const listed = Object.keys(man.files || {}), bad = [], extra = found.filter(f => f !== 'MANIFEST.json' && !listed.includes(f) && !f.endsWith('.DS_Store'));
for (const f of listed) { let h = null; try { h = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex'); } catch {} if (h !== man.files[f]) bad.push(f); }
if (bad.length || extra.length) out({ ok: false, reason: 'The bundle does not match its manifest, so it was not approved for publishing.', changedOrMissing: bad, notInManifest: extra });
const engine = listed.filter(f => /^engine\/[A-Za-z0-9._-]+\.js$/.test(f)).sort();
if (!listed.includes('game/index.html') || !listed.includes('capabilities.json') || !engine.length) out({ ok: false, reason: 'The bundle is missing the page, the engine or the permission set.' });
out({ ok: true, dir, build: man.build, clock: man.clock, page: 'game/index.html', files: Object.fromEntries(engine.map(f => [f, f])),
  capabilities: JSON.parse(fs.readFileSync(path.join(dir, 'capabilities.json'), 'utf8')) });
