---
name: helper
description: Install (or remove) the Agents of Claude desktop helper, so the game syncs your XP and shows whether Claude is working automatically when opened in the Claude desktop app. Use when the player asks to set up automatic sync, install the helper, or remove it.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/install-helper.mjs"*)
---

Install the Agents of Claude desktop helper for this player.

1. Tell the player in one or two sentences what this does: it adds one local server entry, "agents-of-claude", to the Claude desktop app's config, so the game (opened in the desktop app) can read this machine's daily XP totals and Claude's working/idle status. Nothing else in the config changes, a backup is kept, and only daily totals and timestamps are shared, never prompts or files. Ask them to confirm before changing anything.
2. Once they agree, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/install-helper.mjs"`. If they asked to remove it, run it with `--uninstall`; to only check, `--check`.
3. Read the JSON it prints. If `ok` is false, tell them the `reason`. Otherwise tell them the `next` step (usually: quit and reopen the Claude desktop app, then open the game there).
