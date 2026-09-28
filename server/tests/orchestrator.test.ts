import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeTextResponse, claudeToolUseResponse, createTestCase } from './helpers.js';

vi.mock('../src/agent/claudeClient.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/agent/claudeClient.js')>();
  return { ...actual, anthropic: { messages: { create: vi.fn() } } };
});

const { anthropic } = await import('../src/agent/claudeClient.js');
const { runAgentTurn } = await import('../src/agent/orchestrator.js');
const { db } = await import('../src/db.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

describe('scenario 8: conversation context is grounded in stored state, not chat memory', () => {
  it('re-fetches the case via get_case rather than trusting anything said earlier in the conversation', async () => {
    const kase = await createTestCase({
      facts: { fine_amount: { value: 240, source: 'document', needsConfirmation: false } },
    });

    // Turn 1: a plain question, answered directly without tools.
    createMock.mockResolvedValueOnce(claudeTextResponse('Ik heb je vraag genoteerd.'));
    await runAgentTurn(kase.id, 'Hoi, kun je me helpen?');
    createMock.mockClear(); // isolate turn 2's calls below

    // Turn 2: the model calls get_case before answering — this must hit the
    // REAL get_case handler (not a stub), returning the current €240, even
    // though nothing about the amount was said in this conversation's text.
    createMock
      .mockResolvedValueOnce(claudeToolUseResponse('get_case', {}, 'call_1'))
      .mockResolvedValueOnce(claudeTextResponse('Je boetebedrag is €240.'));

    const { reply } = await runAgentTurn(kase.id, 'Wat is het boetebedrag ook alweer?');

    expect(reply).toBe('Je boetebedrag is €240.');
    expect(createMock).toHaveBeenCalledTimes(2); // 1 tool-use round + 1 final round, this turn

    // The tool_result the model received must reflect the real stored fact.
    const toolCallArgs = createMock.mock.calls[1][0] as {
      messages: Array<{ role: string; content: unknown }>;
    };
    const toolResultMessage = toolCallArgs.messages.find(
      (m) => m.role === 'user' && Array.isArray(m.content),
    );
    const toolResultContent = JSON.stringify(toolResultMessage?.content);
    expect(toolResultContent).toContain('240');
  });

  it('only persists final user/assistant text turns, never intermediate tool_use/tool_result content', async () => {
    const kase = await createTestCase();

    createMock
      .mockResolvedValueOnce(claudeToolUseResponse('get_case', {}, 'call_1'))
      .mockResolvedValueOnce(claudeTextResponse('Zaak opgehaald, alles ziet er goed uit.'));

    await runAgentTurn(kase.id, 'Kun je de zaak checken?');

    const messages = await db.message.findMany({ where: { caseId: kase.id }, orderBy: { createdAt: 'asc' } });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'user', content: 'Kun je de zaak checken?' });
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'Zaak opgehaald, alles ziet er goed uit.' });
    // No leaked raw tool-call JSON in what actually gets stored/replayed.
    expect(messages.every((m) => !m.content.includes('tool_use') && !m.content.includes('call_1'))).toBe(true);
  });

  it('a second turn does not receive the first turn\'s tool_use/tool_result blocks as history', async () => {
    const kase = await createTestCase();

    createMock
      .mockResolvedValueOnce(claudeToolUseResponse('get_case', {}, 'call_1'))
      .mockResolvedValueOnce(claudeTextResponse('Eerste antwoord.'));
    await runAgentTurn(kase.id, 'Eerste vraag');

    createMock.mockResolvedValueOnce(claudeTextResponse('Tweede antwoord.'));
    await runAgentTurn(kase.id, 'Tweede vraag');

    const secondCallArgs = createMock.mock.calls[2][0] as { messages: Array<{ content: unknown }> };
    // History should be plain text turns only — 2 user + 1 assistant so far.
    for (const message of secondCallArgs.messages) {
      expect(typeof message.content).toBe('string');
    }
  });

  it('returns a clean Dutch fallback message instead of leaking a raw provider error', async () => {
    const kase = await createTestCase();
    createMock.mockRejectedValueOnce(new Error('500 credit balance too low'));

    const { reply } = await runAgentTurn(kase.id, 'Wat nu?');

    expect(reply).not.toContain('credit balance');
    expect(reply).toMatch(/niet beschikbaar/i);
  });
});
