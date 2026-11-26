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

That's it: XP now records as you use Claude Code. Run `/agents-of-claude:coach` any time to have Claude review your Agent's recent fights and sharpen its fight knowledge.

## Updating

The game tells you when a newer plugin is out. To update, run this in a terminal and restart Claude Code:

```
claude plugin marketplace update agents-of-claude && claude plugin update agents-of-claude@agents-of-claude
```

If you use the desktop helper, also quit and reopen the Claude desktop app once Claude Code has started: the helper
keeps running the old version until then.

## Automatic sync (Claude desktop app)

Open the game in the Claude desktop app and run this once in Claude Code:

```
/agents-of-claude:helper
```

It adds a small local helper to the desktop app (one config entry, backed up first), so the game syncs your XP every few minutes on its own and shows whether Claude is working right now. Quit and reopen the desktop app afterwards. Run it again with "remove the helper" to uninstall.

## While you work

- **Milestones at the end of a turn**: work crates (every 150 XP), the bonus key and Inspired at 300, your streak, shipped commits. One short line, never mid-task. Set `AOC_QUIET=1` to silence them.
- **Status line**: run `/agents-of-claude:statusline` to show your Agent, where it is and when it is back, and today's XP in Claude Code's status line.
- **Your work speeds up the game**: every 8 XP you earn while your Agent is away brings it home a minute sooner (up to half the trip), and every 150 XP is a work crate in the game.

## What it does

- **Records XP locally.** Hooks on session start, prompts, tool calls and finished turns append hash-chained XP events to `~/.claude/agents-of-claude/ledger.jsonl`. Only the event type and XP are stored: never your prompt text, file names or commands. Each hook call takes about 50 ms and can't block a session.
- **Syncs daily totals.** Run `/agents-of-claude:quest-sync`, or let it happen: if nothing has synced for 24 hours, Claude runs the sync after your next request. What reaches the game, into a private record only you can read: per-day XP, per-day counts of each kind of event (prompts, tool calls, edits, commits, finished turns), and a ledger checksum. With the desktop helper, the time and kind of your latest Claude Code event and how many sessions are active, for the "Claude is working" status. Never prompt text, file names, commands or code. Other players see your level, not your usage.

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

In the game, Claude fights your duels round by round and can run your Agent's days on autopilot, learning after every fight (duels, the Pit, the world boss, trips) in one pool of fight knowledge that every fight decision reads. Run `/agents-of-claude:coach` in Claude Code to review many fights at once and rewrite that knowledge with sharper lessons.

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

## Worlds

A world is one game page; each organization runs its own, and worlds don't see each other.

- **Joining another organization's world:** your host gives you a page link and a clock offset. Run `/agents-of-claude:join <page link> <offset>` once (for example `/agents-of-claude:join https://claude.ai/artifact/… +01:00`), then `/agents-of-claude:quest-sync`. Players of the first world need no setup.
- **Hosting a world:** start Claude Code in an empty folder and run `/agents-of-claude:host`. It downloads the newest release from [the releases repository](https://github.com/DeRavenWBC/agents-of-claude-releases) (or uses a bundle folder you name), asks you for your world's clock, and publishes it. It checks the bundle against its manifest before publishing anything, keeps your world's older fights counting when an update changes the combat rules, and tells the game its own join command so players see it on the setup card. The bundle's `HOSTING.md` explains sharing and what you are responsible for.

## Security

- What runs on your machine: one small script on each Claude Code hook event (session start and end, prompt, tool use, end of turn). It keeps only the kind of event and its XP in `~/.claude/agents-of-claude/`: no prompt text, file names, commands or tool output.
- Skills may only run their own script from this plugin's own folder (`node "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs"`), not arbitrary commands and not a look-alike path elsewhere.
- The coach never reads or writes your Agent's journal. It reads a brief the game prepares (every line cleaned and bounded, because names and battle text come from other players) and writes a draft the game checks before applying.
- The helper installer backs up the desktop config before every change and writes it atomically. The helper exposes one read-only tool (daily XP totals and whether Claude is working).
- XP is self-reported: the game caps it (400 a day in full, 400 more at half) rather than trusting the ledger. The ledger's hash chain catches accidents, not deliberate edits.
- Updates come from this repository. Releases are tagged (`v0.6.2`, …); only the owner can push to `main`.
- For a locked-down organization: fork this repository, review it, and install from your fork (`/plugin install agents-of-claude --marketplace <your-org>/agents-of-claude`), so nothing reaches your machines until you pull a release you have read.

## Uninstall

`/plugin uninstall agents-of-claude`. Your ledger stays in `~/.claude/agents-of-claude/` until you delete it.
