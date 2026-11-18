#!/usr/bin/env node
// Agents of Claude — manual / nudged sync preparation.
//   node quest-sync.mjs               → writes one JSON file per day for Claude to upload with ArtifactData,
//                                       prints a JSON summary. Uploads nothing itself.
//   node quest-sync.mjs --mark-synced → records that Claude finished uploading (stops the daily nudge).

import fs from 'node:fs';
import path from 'node:path';
import { DIR, buildDays, updateSyncState } from './days.mjs';

const OUT = path.join(DIR, 'sync');
const { docs, chain, ledgerLines, lastSeq } = buildDays();

if (process.argv.includes('--mark-synced')) {
  updateSyncState({ lastSuccess: new Date().toISOString(), syncedSeq: lastSeq, via: 'claude-code' });
  console.log(JSON.stringify({ marked: true, syncedSeq: lastSeq }));
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.json')) fs.rmSync(path.join(OUT, f));

const summary = docs.map(doc => {
  const file = path.join(OUT, `${doc.day}.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return { doc_id: doc.day, file_path: file, raw: doc.raw, events: doc.events };
});

console.log(JSON.stringify({
  collection: 'data/users/me/xp/days',
  chainOk: chain.ok,
  brokenAtLine: chain.brokenAt,
  ledgerLines,
  days: summary,
}, null, 2));
