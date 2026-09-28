import { beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { claudeJsonResponse, createTestCase, createTestDocument } from './helpers.js';

vi.mock('../src/agent/claudeClient.js', async (importOriginal) => {
  // Same pattern as api.test.ts: callClaudeJSON is reimplemented against the
  // mocked `anthropic` so the real JSON parsing path is still exercised.
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
    return JSON.parse(textBlock.text);
  };
  return { ...actual, anthropic, callClaudeJSON };
});

const { anthropic } = await import('../src/agent/claudeClient.js');
const { app } = await import('../src/app.js');
const { db } = await import('../src/db.js');
const { runRules } = await import('../src/rules/engine.js');
const { maxCollectionCosts } = await import('../src/rules/generic.js');
const { extractCaseInformationTool } = await import('../src/agent/tools/extractCaseInformation.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

const fact = (value: string | number) => ({ value, source: 'user_provided' as const, needsConfirmation: false });

describe('every category has a real rule set', () => {
  it.each([
    ['overheid', ['authority', 'decision_subject', 'decision_date', 'issue']],
    ['werk', ['employer', 'issue']],
    ['wonen', ['landlord', 'issue']],
    ['aankopen', ['seller', 'product', 'issue']],
    ['geld', ['creditor', 'amount', 'issue']],
    ['anders', ['counterparty', 'issue']],
  ])('%s requires its own key facts', (caseType, required) => {
    const missing = runRules(caseType, {}).filter((r) => r.code === 'missing_required_field');
    expect(missing.map((r) => r.field).sort()).toEqual([...required].sort());
  });

  it('warns when a government decision is older than the six-week objection period', () => {
    const flags = runRules('overheid', { decision_date: fact('2020-01-01') });
    expect(flags).toContainEqual(expect.objectContaining({ code: 'objection_period_possibly_passed' }));
  });

  it('does not warn about the objection period when the letter states a future deadline', () => {
    const flags = runRules('overheid', { decision_date: fact('2020-01-01'), objection_deadline: fact('2999-01-01') });
    expect(flags.map((r) => r.code)).not.toContain('objection_period_possibly_passed');
  });

  it('computes the statutory maximum collection costs', () => {
    expect(maxCollectionCosts(100)).toBe(40); // minimum
    expect(maxCollectionCosts(1000)).toBeCloseTo(150);
    expect(maxCollectionCosts(3000)).toBeCloseTo(425);
    expect(maxCollectionCosts(10_000_000)).toBe(6775); // maximum
  });

  it('flags collection costs above the statutory maximum', () => {
    expect(runRules('geld', { amount: fact(1000), collection_costs: fact(250) })).toContainEqual(
      expect.objectContaining({ code: 'collection_costs_above_limit' }),
    );
    expect(runRules('geld', { amount: fact(1000), collection_costs: fact(150) }).map((r) => r.code)).not.toContain(
      'collection_costs_above_limit',
    );
  });

  it('flags a negative amount in any category', () => {
    expect(runRules('aankopen', { amount: fact(-5) })).toContainEqual(
      expect.objectContaining({ code: 'invalid_amount', field: 'amount' }),
    );
  });
});

describe('extraction follows the case type', () => {
  it('extracts employment fields for a werk case and ignores fine fields', async () => {
    const kase = await createTestCase({ caseType: 'werk' });
    const document = await createTestDocument(kase.id);
    createMock.mockResolvedValueOnce(
      claudeJsonResponse({
        employer: 'Bakkerij de Korst',
        fine_amount: 999,
        confidence: { employer: 0.95, fine_amount: 0.95 },
      }),
    );

    const result = (await extractCaseInformationTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as { mergedFacts: Record<string, { value: unknown }> };

    expect(result.mergedFacts.employer.value).toBe('Bakkerij de Korst');
    expect(result.mergedFacts.fine_amount).toBeUndefined();
    const prompt = createMock.mock.calls[0][0] as { system: string };
    expect(prompt.system).toContain('employer');
  });
});

describe('GET /case-types/:id', () => {
  it('describes the fields and letter for a category', async () => {
    const res = await supertest(app).get('/case-types/wonen');
    expect(res.status).toBe(200);
    expect(res.body.letterTitle).toBe('Brief aan verhuurder');
    expect(res.body.fields.map((f: { key: string }) => f.key)).toContain('landlord');
  });

  it('returns 404 for an unknown category', async () => {
    const res = await supertest(app).get('/case-types/ruimtevaart');
    expect(res.status).toBe(404);
  });
});

describe('POST /cases/:id/letter for a non-fine category', () => {
  it('drafts a letter to the employer as a pending prepare_letter action', async () => {
    const kase = await createTestCase({
      caseType: 'werk',
      facts: { employer: fact('Bakkerij de Korst'), issue: fact('Loon van augustus niet betaald') },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,', 'Met vriendelijke groet,'] }));

    const res = await supertest(app).post(`/cases/${kase.id}/letter`);

    expect(res.body).toMatchObject({ generated: true, title: 'Brief aan werkgever', recipient: 'Bakkerij de Korst' });
    const action = await db.action.findUniqueOrThrow({ where: { id: res.body.actionId } });
    expect(action).toMatchObject({ type: 'prepare_letter', status: 'pending_approval' });
    const prompt = createMock.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(prompt.messages[0].content).toContain('Werkgever: Bakkerij de Korst');
  });
});
