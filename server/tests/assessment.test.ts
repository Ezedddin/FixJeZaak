import { beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { claudeJsonResponse, createTestCase } from './helpers.js';

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

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

const MEDIUM_CONFIDENCE_FACTS = {
  authority: { value: 'CJIB', source: 'document' as const, confidence: 0.7, tier: 'medium' as const, needsConfirmation: true },
  offence: { value: 'speeding', source: 'document' as const, confidence: 0.95, tier: 'high' as const, needsConfirmation: false },
  fine_amount: { value: 240, source: 'document' as const, confidence: 0.7, tier: 'medium' as const, needsConfirmation: true },
  reference_number: { value: 'CJIB-1', source: 'document' as const, confidence: 0.95, tier: 'high' as const, needsConfirmation: false },
};

describe('POST /cases/:id/facts/confirm', () => {
  it('clears needsConfirmation on unchanged values and keeps their document provenance', async () => {
    const kase = await createTestCase({ facts: MEDIUM_CONFIDENCE_FACTS });

    const res = await supertest(app)
      .post(`/cases/${kase.id}/facts/confirm`)
      .send({ facts: { authority: 'CJIB', fine_amount: '240' } });

    expect(res.status).toBe(200);
    expect(res.body.facts.authority).toMatchObject({ value: 'CJIB', source: 'document', needsConfirmation: false });
    expect(res.body.facts.fine_amount).toMatchObject({ source: 'document', needsConfirmation: false });
  });

  it('stores edited values as user_provided and parses Dutch amounts into numbers', async () => {
    const kase = await createTestCase({ facts: MEDIUM_CONFIDENCE_FACTS });

    const res = await supertest(app)
      .post(`/cases/${kase.id}/facts/confirm`)
      .send({ facts: { fine_amount: '€ 1.078,30' } });

    expect(res.body.facts.fine_amount).toEqual({ value: 1078.3, source: 'user_provided', needsConfirmation: false });
  });

  it('adds previously withheld low-confidence fields once the user confirms them, unblocking the rules', async () => {
    const { reference_number: _withheld, ...rest } = MEDIUM_CONFIDENCE_FACTS;
    const kase = await createTestCase({ facts: rest });

    const res = await supertest(app)
      .post(`/cases/${kase.id}/facts/confirm`)
      .send({ facts: { reference_number: 'CJIB-9' } });

    expect(res.body.facts.reference_number.source).toBe('user_provided');
    expect(res.body.ruleFlags.some((r: { field?: string }) => r.field === 'reference_number')).toBe(false);
  });
});

describe('POST /cases/:id/letter', () => {
  it('refuses while fields are unconfirmed, and drafts a pending action after confirmation', async () => {
    const kase = await createTestCase({ facts: MEDIUM_CONFIDENCE_FACTS });

    const refused = await supertest(app).post(`/cases/${kase.id}/letter`);
    expect(refused.body).toMatchObject({ generated: false, reason: 'unconfirmed_fields' });
    expect(createMock).not.toHaveBeenCalled();

    await supertest(app)
      .post(`/cases/${kase.id}/facts/confirm`)
      .send({ facts: { authority: 'CJIB', fine_amount: '240' } });

    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,', 'Met vriendelijke groet,'] }));
    const drafted = await supertest(app).post(`/cases/${kase.id}/letter`);

    expect(drafted.body.generated).toBe(true);
    const action = await db.action.findUniqueOrThrow({ where: { id: drafted.body.actionId } });
    expect(action.status).toBe('pending_approval');
  });
});

describe('POST /cases/:id/analysis', () => {
  const modelAssessment = {
    strength: 'sterk',
    summary: 'Samenvatting.',
    inFavor: ['Kenmerk aanwezig'],
    potentialIssues: [],
    counterArgument: 'Tegenargument.',
    advice: 'Bezwaar indienen',
  };

  it('returns the model assessment together with rule results and sources', async () => {
    const kase = await createTestCase({
      facts: Object.fromEntries(
        Object.entries(MEDIUM_CONFIDENCE_FACTS).map(([k, f]) => [k, { ...f, needsConfirmation: false }]),
      ),
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse(modelAssessment));

    const res = await supertest(app).post(`/cases/${kase.id}/analysis`).send({ hasEvidence: true });

    expect(res.status).toBe(200);
    expect(res.body.strength).toBe('sterk');
    expect(Array.isArray(res.body.ruleFlags)).toBe(true);
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it('forces "onvoldoende_informatie" when the rules report blocking errors, whatever the model says', async () => {
    const kase = await createTestCase({ facts: {} });
    createMock.mockResolvedValueOnce(claudeJsonResponse(modelAssessment));

    const res = await supertest(app).post(`/cases/${kase.id}/analysis`).send({ hasEvidence: false });

    expect(res.body.strength).toBe('onvoldoende_informatie');
    expect(res.body.ruleFlags.some((r: { severity: string }) => r.severity === 'error')).toBe(true);
  });

  it('rejects a model reply that does not match the expected shape', async () => {
    const kase = await createTestCase({ facts: {} });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ strength: '95% kans' }));

    const res = await supertest(app).post(`/cases/${kase.id}/analysis`).send({ hasEvidence: false });

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe('POST /intake/classify', () => {
  it('returns a validated category and title', async () => {
    createMock.mockResolvedValueOnce(claudeJsonResponse({ category: 'boete', title: 'Flitsboete A2' }));

    const res = await supertest(app).post('/intake/classify').send({ text: 'Ik ben geflitst op de A2' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ category: 'boete', title: 'Flitsboete A2' });
  });

  it('rejects a category outside the allowed list', async () => {
    createMock.mockResolvedValueOnce(claudeJsonResponse({ category: 'strafrecht', title: 'x' }));

    const res = await supertest(app).post('/intake/classify').send({ text: 'iets' });

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe('POST /cases/:caseId/actions/:actionId/approve', () => {
  it('stores the final, user-edited letter text on approval', async () => {
    const kase = await createTestCase();
    const action = await db.action.create({
      data: { caseId: kase.id, type: 'prepare_objection', status: 'pending_approval', payload: { paragraphs: ['Concept'] } },
    });

    const res = await supertest(app)
      .post(`/cases/${kase.id}/actions/${action.id}/approve`)
      .send({ paragraphs: ['Geachte heer/mevrouw,', 'Mijn aangepaste tekst.'] });

    expect(res.status).toBe(200);
    const stored = await db.action.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.status).toBe('approved');
    expect(stored.payload).toMatchObject({ paragraphs: ['Geachte heer/mevrouw,', 'Mijn aangepaste tekst.'], editedByUser: true });
  });
});
