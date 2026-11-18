# Agents of Claude: Claude Code plugin

Earn XP for your Agent in **Agents of Claude**, the org pixel-art RPG, from your Claude Code usage.

Game: https://claude.ai/artifact/KVff7XMzGBmd7S7h4UjdTy (you need Contributor access to create an Agent).

## Quick start

In Claude Code, run:

```
/plugin install agents-of-claude --marketplace DeRavenWBC/agents-of-claude
```

Answer `y` to add the marketplace and press Enter for the user scope. Then open the game, create your Agent, and run:

```
/agents-of-claude:quest-sync
```

That's it: XP now records as you use Claude Code. Run `/agents-of-claude:coach` any time to have Claude review your Agent's recent duels and sharpen its Battle Journal.

## While you work

- **Milestones at the end of a turn**: work crates (every 150 XP), the bonus key and Inspired at 300, your streak, shipped commits. One short line, never mid-task. Set `AOC_QUIET=1` to silence them.
- **Status line**: run `/agents-of-claude:statusline` to show your Agent, where it is and when it is back, and today's XP in Claude Code's status line.
- **Your work speeds up the game**: every 8 XP you earn while your Agent is away brings it home a minute sooner (up to half the trip), and every 150 XP is a work crate in the game.

## What it does

- **Records XP locally.** Hooks on session start, prompts, tool calls and finished turns append hash-chained XP events to `~/.claude/agents-of-claude/ledger.jsonl`. Only the event type and XP are stored: never your prompt text, file names or commands. Each hook call takes about 50 ms and can't block a session.
- **Syncs daily totals.** Run `/agents-of-claude:quest-sync`, or let it happen: if nothing has synced for 24 hours, Claude runs the sync after your next request. Only per-day totals reach the game, into a private record that only you can read. Other players see your level, not your usage.

| Earns XP | Base XP | Limit |
| --- | --- | --- |
| First session of the day | 50 | once a day |
| Prompt | 5 | 1 per 10 s |
| Tool call | 1 | 1 per 2 s |
| Edit or Write | 2 | 1 per 2 s |
| Real `git commit` | 15 | 10 a day |
| Finished turn | 3 | 1 per 10 s |

The game counts the first 400 XP a day in full, the next 400 at half, and nothing past 800. Days end at 00:00 SAST.

## Coach your Agent

In the game, Claude fights your duels round by round and can run your Agent's days on autopilot, learning as it goes in a Battle Journal. Run `/agents-of-claude:coach` in Claude Code to review your recent duels and outings and rewrite the journal with sharper lessons.

## Install

Requires Node 18 or later on your PATH.

At the prompt of a Claude Code terminal session:

```
/plugin install agents-of-claude --marketplace DeRavenWBC/agents-of-claude
```

Answer `y` to add the marketplace, then pick the user scope (Enter). From a shell instead:

```
claude plugin install agents-of-claude --marketplace DeRavenWBC/agents-of-claude
```

In the Claude desktop app, where `/plugin` doesn't run: click + next to the prompt box, then Plugins, Add marketplace with `DeRavenWBC/agents-of-claude`, then Add plugin.


Then open the game, create your Agent (you need Contributor access to the page), and run `/agents-of-claude:quest-sync` once.

## Uninstall

`/plugin uninstall agents-of-claude`. Your ledger stays in `~/.claude/agents-of-claude/` until you delete it.
