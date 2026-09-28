import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { db } from '../src/db.js';
import type { CaseFacts } from '../src/types.js';

export async function createTestCase(overrides: { caseType?: string; facts?: CaseFacts } = {}) {
  return db.case.create({
    data: {
      userId: 'test-user',
      caseType: overrides.caseType ?? 'boete',
      facts: overrides.facts as never,
    },
  });
}

/** Writes a real (tiny, content-irrelevant) file to disk and registers a
 * Document row pointing at it — `analyze_document`/`extract_case_information`
 * genuinely call `fs.readFile` on this path, so it must exist for the
 * "readable" path of a test. */
export async function createTestDocument(caseId: string, filename = 'boete.jpg') {
  const storagePath = path.join(os.tmpdir(), `fixjezaak-test-${Date.now()}-${filename}`);
  await fs.writeFile(storagePath, Buffer.from('not a real image, content is irrelevant in tests'));
  return db.document.create({
    data: { caseId, filename, mimeType: 'image/jpeg', storagePath },
  });
}

/** Points a Document at a path that does not exist, to deterministically
 * exercise the "unreadable document" failure path without any mocking. */
export async function createUnreadableTestDocument(caseId: string, filename = 'corrupt.jpg') {
  return db.document.create({
    data: {
      caseId,
      filename,
      mimeType: 'image/jpeg',
      storagePath: path.join(os.tmpdir(), `fixjezaak-does-not-exist-${Date.now()}.jpg`),
    },
  });
}

/** Shapes a fake Anthropic Messages API response carrying a single JSON text
 * block — this is what `callClaudeJSON` parses, so mocking at this level
 * exercises the real parsing code instead of bypassing it. */
export function claudeJsonResponse(payload: unknown): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content: [{ type: 'text', text: JSON.stringify(payload), citations: [] }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
  } as Anthropic.Message;
}

/** Shapes a fake response carrying a final plain-text reply (no tool use) —
 * ends the orchestrator's tool loop. */
export function claudeTextResponse(text: string): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content: [{ type: 'text', text, citations: [] }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
  } as Anthropic.Message;
}

/** Shapes a fake response where the model calls a single tool. */
export function claudeToolUseResponse(toolName: string, input: unknown, id = 'tool_1'): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content: [{ type: 'tool_use', id, name: toolName, input }],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
  } as Anthropic.Message;
}
