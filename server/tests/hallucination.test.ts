import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeJsonResponse, createTestCase } from './helpers.js';

vi.mock('../src/agent/claudeClient.js', async (importOriginal) => {
  // `callClaudeJSON`'s real body closes over its OWN module's `anthropic`
  // binding — re-exporting `{...actual, anthropic: mock}` does not redirect
  // that closure. So `callClaudeJSON` is reimplemented here against the same
  // mocked `anthropic` object, instead of reused from `actual`.
  const actual = await importOriginal<typeof import('../src/agent/claudeClient.js')>();
  const anthropic = { messages: { create: vi.fn() } };
  const callClaudeJSON = async (params: { system: string; content: unknown; maxTokens?: number }) => {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: params.maxTokens ?? 800,
      system: params.system,
      messages: [{ role: 'user', content: params.content }],
    });
    const textBlock = (response.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    );
    if (!textBlock?.text) throw new Error('no_model_text_response');
    const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    return JSON.parse(cleaned);
  };
  return { ...actual, anthropic, callClaudeJSON };
});

const { anthropic } = await import('../src/agent/claudeClient.js');
const { generateDocumentTool } = await import('../src/agent/tools/generateDocument.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

/**
 * Scenario 5 (hallucination resistance): the product spec's example is a
 * user literally asking the assistant to "write an objection and invent a
 * legal reason". We can't deterministically assert what a live model would
 * *say* in a mocked test — so instead we assert the part of the system that
 * makes the refusal structural rather than a matter of the model's good
 * behavior: generate_document refuses outright when facts aren't validated,
 * and when it does proceed, it explicitly forbids the model from inventing
 * legal grounds beyond what search_knowledge actually found.
 */
describe('scenario 5: hallucination resistance is enforced structurally, not just requested', () => {
  it('refuses to generate a document when required facts are missing (blocking rule errors)', async () => {
    const kase = await createTestCase({ facts: { authority: { value: 'CJIB', source: 'document', needsConfirmation: false } } });

    const result = (await generateDocumentTool.handler(
      { caseId: kase.id, documentType: 'bezwaarschrift' },
      { caseId: kase.id },
    )) as { generated: boolean; reason: string };

    expect(result.generated).toBe(false);
    expect(result.reason).toBe('blocking_rule_errors');
    expect(createMock).not.toHaveBeenCalled(); // never even asks the model to write anything
  });

  it('refuses to generate a document while a field still needs user confirmation', async () => {
    const kase = await createTestCase({
      facts: {
        authority: { value: 'CJIB', source: 'document', needsConfirmation: false },
        offence: { value: 'speeding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'ABC123', source: 'document', needsConfirmation: false },
        fine_amount: { value: 240, source: 'document', confidence: 0.5, tier: 'low', needsConfirmation: true },
      },
    });

    const result = (await generateDocumentTool.handler(
      { caseId: kase.id, documentType: 'bezwaarschrift' },
      { caseId: kase.id },
    )) as { generated: boolean; reason: string; fields: string[] };

    expect(result.generated).toBe(false);
    expect(result.reason).toBe('unconfirmed_fields');
    expect(result.fields).toContain('fine_amount');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('explicitly instructs the model not to invent legal grounds when no knowledge source matches', async () => {
    // "anders" is a genuinely unsupported case type: no rule set (so no
    // blocking errors) and no knowledge source at all (so search_knowledge
    // is guaranteed empty regardless of the query) — this isolates the
    // "no source found" prompt path from the "bezwaartermijn" query always
    // scoring a hit against the boete-specific knowledge stub.
    const kase = await createTestCase({
      caseType: 'anders',
      facts: {
        authority: { value: 'Gemeente Nergenshuizen', source: 'document', needsConfirmation: false },
        offence: { value: 'een geheel verzonnen overtreding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'XYZ-000', source: 'document', needsConfirmation: false },
        fine_amount: { value: 42, source: 'document', needsConfirmation: false },
      },
    });

    createMock.mockResolvedValueOnce(
      claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,', 'Hierbij maak ik bezwaar.'] }),
    );

    await generateDocumentTool.handler({ caseId: kase.id, documentType: 'bezwaarschrift' }, { caseId: kase.id });

    expect(createMock).toHaveBeenCalledTimes(1);
    const request = createMock.mock.calls[0][0] as { system: string; messages: Array<{ content: string }> };
    const promptText = request.messages[0].content;
    expect(request.system).toMatch(/Verzin geen wetsartikelen/i);
    // Our (fake) case type has no matching knowledge entry, so the prompt
    // must say so explicitly rather than silently leaving the model to fill
    // the gap with something plausible-sounding.
    expect(promptText).toMatch(/Geen relevante kennisbron gevonden/i);
    expect(promptText).toMatch(/noem geen specifieke wettelijke termijn of grondslag/i);
  });

  it('produces a draft that is a pending approval, never an already-sent document', async () => {
    const kase = await createTestCase({
      facts: {
        authority: { value: 'CJIB', source: 'document', needsConfirmation: false },
        offence: { value: 'speeding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'ABC123', source: 'document', needsConfirmation: false },
        fine_amount: { value: 240, source: 'document', needsConfirmation: false },
      },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,'] }));

    const result = (await generateDocumentTool.handler(
      { caseId: kase.id, documentType: 'bezwaarschrift' },
      { caseId: kase.id },
    )) as { generated: boolean; actionId: string };

    expect(result.generated).toBe(true);
    const { db } = await import('../src/db.js');
    const action = await db.action.findUniqueOrThrow({ where: { id: result.actionId } });
    expect(action.status).toBe('pending_approval');
  });
});
