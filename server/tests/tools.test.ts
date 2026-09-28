import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claudeJsonResponse, createTestCase, createTestDocument, createUnreadableTestDocument } from './helpers.js';

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
const { analyzeDocumentTool } = await import('../src/agent/tools/analyzeDocument.js');
const { extractCaseInformationTool } = await import('../src/agent/tools/extractCaseInformation.js');
const { updateCaseTool } = await import('../src/agent/tools/updateCase.js');
const { getCaseTool } = await import('../src/agent/tools/getCase.js');
const { runTool } = await import('../src/agent/tools/index.js');
const { db } = await import('../src/db.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

describe('scenario 1: correct extraction from a readable document', () => {
  it('trusts high-confidence fields and merges them into Case.facts', async () => {
    const kase = await createTestCase();
    const document = await createTestDocument(kase.id);

    createMock.mockResolvedValueOnce(
      claudeJsonResponse({
        authority: 'CJIB',
        offence: 'speeding',
        date: '2026-06-01',
        location: 'A2 Utrecht',
        measured_speed: 128,
        allowed_speed: 100,
        corrected_speed: 125,
        fine_amount: 240,
        reference_number: 'CJIB-998877',
        objection_deadline: '2026-12-01',
        confidence: {
          authority: 0.97,
          offence: 0.95,
          fine_amount: 0.98,
          reference_number: 0.96,
          measured_speed: 0.95,
          allowed_speed: 0.95,
          corrected_speed: 0.95,
          date: 0.95,
          location: 0.9,
          objection_deadline: 0.95,
        },
      }),
    );

    const result = (await extractCaseInformationTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as { mergedFacts: Record<string, { value: unknown; tier: string; needsConfirmation: boolean }> };

    expect(result.mergedFacts.authority).toMatchObject({
      value: 'CJIB',
      tier: 'high',
      needsConfirmation: false,
    });
    expect(result.mergedFacts.fine_amount).toMatchObject({ value: 240, tier: 'high' });

    const persisted = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
    expect((persisted.facts as Record<string, unknown>).reference_number).toBeTruthy();
  });

  it('keeps low-confidence fields out of trusted facts until confirmed', async () => {
    const kase = await createTestCase();
    const document = await createTestDocument(kase.id);

    createMock.mockResolvedValueOnce(
      claudeJsonResponse({
        authority: 'CJIB',
        fine_amount: 240,
        confidence: { authority: 0.95, fine_amount: 0.3 },
      }),
    );

    const result = (await extractCaseInformationTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as { mergedFacts: Record<string, unknown>; lowConfidenceFieldsNotYetTrusted: string[] };

    expect(result.mergedFacts.fine_amount).toBeUndefined();
    expect(result.lowConfidenceFieldsNotYetTrusted).toContain('fine_amount');
  });
});

describe('scenario 4: unreadable document', () => {
  it('fails fast when the file cannot be read from disk, without calling Claude', async () => {
    const kase = await createTestCase();
    const document = await createUnreadableTestDocument(kase.id);

    const result = (await analyzeDocumentTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as { readable: boolean; notes: string };

    expect(result.readable).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('respects the model saying a readable file is not a usable document', async () => {
    const kase = await createTestCase();
    const document = await createTestDocument(kase.id);

    createMock.mockResolvedValueOnce(
      claudeJsonResponse({ readable: false, documentType: 'unknown', notes: 'Foto is te wazig.' }),
    );

    const result = (await analyzeDocumentTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as { readable: boolean };

    expect(result.readable).toBe(false);
  });
});

describe('scenario 6: invalid / malicious tool input is never trusted as-is', () => {
  it('rejects update_case attempting to set status to "approved"', async () => {
    const kase = await createTestCase();
    const { result, isError } = await runTool(
      'update_case',
      { status: 'approved' },
      { caseId: kase.id },
    );
    expect(isError).toBe(true);
    expect((result as { error: string }).error).toBe('invalid_tool_input');

    const persisted = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
    expect(persisted.status).not.toBe('approved');
  });

  it('rejects a call to a tool name that does not exist', async () => {
    const kase = await createTestCase();
    const { result, isError } = await runTool('delete_everything', {}, { caseId: kase.id });
    expect(isError).toBe(true);
    expect((result as { error: string }).error).toContain('unknown_tool');
  });

  it('pins caseId to the trusted context, ignoring any caseId the model tries to supply', async () => {
    const ownCase = await createTestCase();
    const otherCase = await createTestCase();

    // The model "claims" a different case's id in its tool input — runTool
    // must override it with the id from the trusted server-side context.
    const { result } = await runTool('get_case', { caseId: otherCase.id }, { caseId: ownCase.id });
    expect((result as { id: string }).id).toBe(ownCase.id);
  });
});

describe('scenario 9: explicit user correction overrides prior (even high-confidence) facts', () => {
  it('marks a user-supplied correction as source "user_provided" and trusted', async () => {
    const kase = await createTestCase({
      facts: {
        fine_amount: { value: 50, source: 'document', confidence: 0.7, tier: 'medium', needsConfirmation: true },
      },
    });

    const result = (await updateCaseTool.handler(
      { caseId: kase.id, corrections: { fine_amount: 78.3 } },
      { caseId: kase.id },
    )) as { facts: Record<string, { value: unknown; source: string; needsConfirmation: boolean }> };

    expect(result.facts.fine_amount).toEqual({
      value: 78.3,
      source: 'user_provided',
      needsConfirmation: false,
    });

    const viaGetCase = (await getCaseTool.handler({ caseId: kase.id }, { caseId: kase.id })) as {
      facts: Record<string, { value: unknown }>;
    };
    expect(viaGetCase.facts.fine_amount.value).toBe(78.3);
  });
});
