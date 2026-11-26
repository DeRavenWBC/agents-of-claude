---
name: quest-sync
description: Sync your Claude Code usage XP to Agents of Claude, the org pixel RPG. Use when the player asks to sync XP, or when an Agents of Claude reminder says a sync is due.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/quest-sync.mjs"*), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs" --show*), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/fetch-release.mjs" --check*), ArtifactData
---

Sync this player's Agents of Claude usage XP to the world this machine plays in.

The sync script is `${CLAUDE_PLUGIN_ROOT}/scripts/quest-sync.mjs`.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/quest-sync.mjs"`. It prints JSON with `game` (the game page's URL: use it as the `url` of every ArtifactData call below), `collection`, `chainOk` and a `days` list of `{doc_id, file_path, raw, events}`. If `days` is empty, say there is nothing to sync yet and stop.
2. Call ArtifactData `list` on that `collection` with that `game` URL, to get the `version` of each day that already exists.
3. Call ArtifactData `batch` with one `set` per day: `collection` from step 1, `doc_id` = the day, `file_path` = that day's file, and `if_version` = the version from step 2 when the day already exists (leave it out for new days). If the batch reports a version conflict, list again and retry once.
4. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/quest-sync.mjs" --mark-synced` so the daily reminder knows the sync is done.
5. For the status line, call ArtifactData `get` with collection `data/users/me` and doc_id `progress`, without `out_dir` (Claude Code refuses saves into `~/.claude`). Then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/quest-sync.mjs" --cache-progress "<the file the result says it saved>"`; it keeps only the Agent summary where the status line reads it. Skip this step quietly if either fails or no file was saved.
6. Only if this machine hosts the world: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs" --show`; if its `hosted` link equals the `game` URL, call ArtifactData `get` on that URL, collection `meta`, doc_id `build` (its `v` is the world's build), then run `node "${CLAUDE_PLUGIN_ROOT}/scripts/fetch-release.mjs" --check <that build>`. If it prints `newer: true`, call ArtifactData `get` on collection `meta`, doc_id `release`, and if its `build` differs from `latest`, `set` it to `{"build": <latest>, "notes": <notes>, "at": "<now, ISO>"}` (with `if_version` when it exists): the game then tells the host on Home that a new build is out. Skip this step quietly if anything fails.
7. Reply in two lines at most: how many days were synced and today's raw XP. If `chainOk` is false, add one line saying the local ledger's hash chain is broken at line `brokenAtLine`, so the game will mark those days as edited.

Write only to the `data/users/me/xp/days` collection of that one game page. The only other things you may do are read `data/users/me/progress` for the status line and, on a world this machine hosts, read `meta/build` and `meta/release` and write `meta/release` (step 6). If ArtifactData is not available (headless `claude -p` runs don't have it), say the sync needs an interactive Claude Code session and stop. If the game refuses the write, say the player needs access to use the game page (and, if they play in another organization's world, to run `/agents-of-claude:join` with the link their host gave them) and stop.
