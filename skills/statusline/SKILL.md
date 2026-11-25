---
name: statusline
description: Show your Agents of Claude Agent in Claude Code's status line (today's XP, where your Agent is, when it is back). Use when the player asks to add or set up the Agents of Claude status line.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/statusline.mjs"*), Read(~/.claude/settings.json), Edit(~/.claude/settings.json)
---

Set up the Agents of Claude status line for this player.

1. Run `echo "${CLAUDE_PLUGIN_ROOT}"` to get the plugin's folder. The command is `node "<that folder>/scripts/statusline.mjs"`. Run it once to check it prints a line.
2. Read `~/.claude/settings.json` (create `{}` if it does not exist). If it already has a `statusLine`, show the player what is there and ask before replacing it.
3. Set `"statusLine": { "type": "command", "command": "node \"<that folder>/scripts/statusline.mjs\"" }`, keeping every other setting as it is.
4. Reply in one line: the status line is on, and it fills in your Agent's name and travels after the next `/agents-of-claude:quest-sync`.

Note for the player: the plugin folder changes when the plugin updates, so run this again after an update if the status line goes blank.
