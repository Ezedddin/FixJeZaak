import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const { env } = await import('../src/env.js');
const { notifyJuristOfBooking } = await import('../src/notify.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;
const fact = (value: string | number) => ({ value, source: 'user_provided' as const, needsConfirmation: false });

beforeEach(() => {
  createMock.mockReset();
});

function attach(req: supertest.Test) {
  return req.attach('file', Buffer.from('fake image'), { filename: 'bewijs.jpg', contentType: 'image/jpeg' });
}

describe('POST /cases/:id/evidence', () => {
  it('stores readable evidence and uses its description when drafting the letter', async () => {
    const kase = await createTestCase({
      caseType: 'aankopen',
      facts: { seller: fact('Webshop BV'), product: fact('Laptop'), issue: fact('Scherm kapot na 3 maanden') },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ readable: true, summary: 'Foto van een gebarsten laptopscherm.' }));

    const upload = await attach(supertest(app).post(`/cases/${kase.id}/evidence`));
    expect(upload.status).toBe(201);
    const stored = await db.document.findUniqueOrThrow({ where: { id: upload.body.documentId } });
    expect(stored.kind).toBe('evidence');

    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,'] }));
    await supertest(app).post(`/cases/${kase.id}/letter`);
    const prompt = createMock.mock.calls[1][0] as { messages: Array<{ content: string }> };
    expect(prompt.messages[0].content).toContain('Foto van een gebarsten laptopscherm.');
  });

  it('does not store unreadable evidence', async () => {
    const kase = await createTestCase({ caseType: 'aankopen' });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ readable: false, summary: '' }));

    const res = await attach(supertest(app).post(`/cases/${kase.id}/evidence`));
    expect(res.body).toEqual({ readable: false });
    expect(await db.document.count({ where: { caseId: kase.id } })).toBe(0);
  });
});

describe('POST /cases/:id/response', () => {
  it('stores the analysed response and marks the case as response_received', async () => {
    const kase = await createTestCase({ caseType: 'overheid' });
    createMock.mockResolvedValueOnce(
      claudeJsonResponse({
        readable: true,
        outcome: 'afgewezen',
        summary: 'De gemeente handhaaft het besluit.',
        reasons: ['Bezwaar te laat ingediend'],
        nextSteps: [],
      }),
    );

    const res = await attach(supertest(app).post(`/cases/${kase.id}/response`));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ outcome: 'afgewezen', reasons: ['Bezwaar te laat ingediend'] });
    const updated = await db.case.findUniqueOrThrow({ where: { id: kase.id } });
    expect(updated.status).toBe('response_received');
  });

  it('rejects an outcome outside the allowed values', async () => {
    const kase = await createTestCase({ caseType: 'overheid' });
    createMock.mockResolvedValueOnce(
      claudeJsonResponse({ readable: true, outcome: 'gewonnen!', summary: 'x', reasons: [], nextSteps: [] }),
    );
    const res = await attach(supertest(app).post(`/cases/${kase.id}/response`));
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe('booking e-mail to the jurist', () => {
  const booking = {
    professionalId: 'jurist_hasan',
    professionalName: 'Hasan',
    option: '30min',
    name: 'Test',
    email: 'test@voorbeeld.nl',
    question: 'Vraag',
  };
  const original = { ...env, juristEmails: { ...env.juristEmails } };

  afterEach(() => {
    env.resendApiKey = original.resendApiKey;
    env.emailFrom = original.emailFrom;
    env.juristEmails = original.juristEmails;
    vi.unstubAllGlobals();
  });

  it('is skipped while e-mail is not configured', async () => {
    env.resendApiKey = '';
    expect(await notifyJuristOfBooking(booking)).toBe('skipped');
  });

  it('sends to the booked jurist with the user as reply-to when configured', async () => {
    env.resendApiKey = 're_test';
    env.emailFrom = 'FixJeZaak <noreply@voorbeeld.nl>';
    env.juristEmails = { jurist_hasan: 'hasan@voorbeeld.nl' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    expect(await notifyJuristOfBooking(booking)).toBe('sent');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ to: ['hasan@voorbeeld.nl'], reply_to: 'test@voorbeeld.nl' });
  });
});
