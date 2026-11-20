#!/usr/bin/env node
// Agents of Claude — local MCP server (stdio, no dependencies).
// Lets the game page, opened in the Claude desktop app, read this device's
// daily XP totals and write them to the game itself: automatic sync, no tokens.
// Exposes one read-only tool. Only daily totals leave the ledger, never event detail.

import readline from 'node:readline';
import { buildDays, updateSyncState, PLUGIN_VERSION } from './days.mjs';

const TOOLS = [{
  name: 'get_xp_days',
  description: 'Daily Agents of Claude usage-XP totals for the last 14 days (SAST), from the local hash-chained ledger.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, title: 'Read daily XP totals' },
}];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function getXpDays() {
  const { docs, chain, ledgerLines, lastSeq, lastEvent, sessions } = buildDays();
  // Remember the pull so the Claude Code fallback nudge stays quiet.
  updateSyncState({ lastPulled: new Date().toISOString(), pulledSeq: lastSeq });
  // lastEventAt: when Claude Code last did anything (a prompt, a tool call, a finished turn), for the
  // "Claude is working / idle" status on the character sheet. Only the time and kind, never content.
  return { days: docs, chainOk: chain.ok, brokenAtLine: chain.brokenAt, ledgerLines, lastEventAt: lastEvent?.ts || null, lastKind: lastEvent?.kind || null, sessions, plugin: PLUGIN_VERSION, generatedAt: new Date().toISOString() };
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications (initialized, cancelled) need no reply
  try {
    switch (method) {
      case 'initialize':
        return reply(id, {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'agents-of-claude', version: PLUGIN_VERSION || '0.0.0' },
        });
      case 'ping': return reply(id, {});
      case 'tools/list': return reply(id, { tools: TOOLS });
      case 'tools/call': {
        if (params?.name !== 'get_xp_days') return fail(id, -32602, `Unknown tool: ${params?.name}`);
        const data = getXpDays();
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
      }
      default: return fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    return reply(id, { content: [{ type: 'text', text: 'Could not read the Agents of Claude XP ledger on this device.' }], isError: true });
  }
});
