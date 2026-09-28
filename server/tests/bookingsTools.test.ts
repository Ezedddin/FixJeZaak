import { beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { claudeJsonResponse, claudeTextResponse } from './helpers.js';

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

process.env.ADMIN_TOKEN = 'test-admin-token';
const { anthropic } = await import('../src/agent/claudeClient.js');
const { env } = await import('../src/env.js');
env.adminToken = 'test-admin-token';
const { app } = await import('../src/app.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

const VALID_BOOKING = {
  userId: 'user_1',
  professionalId: 'jurist_hasan',
  option: '30min',
  name: 'Test Gebruiker',
  email: 'test@voorbeeld.nl',
  question: 'Ik wil advies over mijn huurcontract.',
};

describe('juristen and bookings', () => {
  it('lists Hasan and Ezeddin as the available juristen', async () => {
    const res = await supertest(app).get('/professionals');
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Hasan', 'Ezeddin']);
  });

  it('stores a booking request for a known jurist', async () => {
    const res = await supertest(app).post('/bookings').send(VALID_BOOKING);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('requested');
  });

  it('rejects a booking for an unknown jurist or with an invalid email', async () => {
    const unknown = await supertest(app).post('/bookings').send({ ...VALID_BOOKING, professionalId: 'jurist_x' });
    expect(unknown.status).toBe(400);
    const badEmail = await supertest(app).post('/bookings').send({ ...VALID_BOOKING, email: 'geen-email' });
    expect(badEmail.status).toBe(400);
  });

  it('only lists bookings with the admin token', async () => {
    await supertest(app).post('/bookings').send(VALID_BOOKING);

    const anonymous = await supertest(app).get('/bookings');
    expect(anonymous.status).toBe(401);

    const admin = await supertest(app).get('/bookings').set('x-admin-token', 'test-admin-token');
    expect(admin.status).toBe(200);
    expect(admin.body.length).toBeGreaterThan(0);
    expect(admin.body[0].email).toBe('test@voorbeeld.nl');
  });
});

describe('POST /tools/contract-analysis', () => {
  it('returns the validated clause analysis', async () => {
    createMock.mockResolvedValueOnce(
      claudeJsonResponse({
        readable: true,
        summary: 'Eén aandachtspunt.',
        clauses: [{ title: 'Opzegtermijn', risk: 'gemiddeld', explanation: 'Twee maanden.', suggestion: null }],
      }),
    );
    const res = await supertest(app)
      .post('/tools/contract-analysis')
      .attach('file', Buffer.from('%PDF-fake'), { filename: 'contract.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.clauses[0].risk).toBe('gemiddeld');
  });

  it('passes through "not readable" so the app can ask for a clearer photo', async () => {
    createMock.mockResolvedValueOnce(claudeJsonResponse({ readable: false, reason: 'Wazige foto' }));
    const res = await supertest(app)
      .post('/tools/contract-analysis')
      .attach('file', Buffer.from('fake'), { filename: 'contract.jpg', contentType: 'image/jpeg' });

    expect(res.body).toEqual({ readable: false, reason: 'Wazige foto' });
  });

  it('rejects an invalid risk level from the model', async () => {
    createMock.mockResolvedValueOnce(
      claudeJsonResponse({ readable: true, summary: 'x', clauses: [{ title: 'a', risk: 'extreem', explanation: 'b' }] }),
    );
    const res = await supertest(app)
      .post('/tools/contract-analysis')
      .attach('file', Buffer.from('fake'), { filename: 'contract.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});

describe('POST /tools/roleplay', () => {
  const scenario = { situation: 'Mijn werkgever wil mijn contract niet verlengen.', counterpartyRole: 'werkgever' };

  it('asks for an opening line when there is no transcript yet', async () => {
    createMock.mockResolvedValueOnce(claudeTextResponse('Fijn dat je er bent.'));
    const res = await supertest(app).post('/tools/roleplay').send({ ...scenario, messages: [] });

    expect(res.body.reply).toBe('Fijn dat je er bent.');
    const sent = createMock.mock.calls[0][0] as { messages: Array<{ role: string }>; system: string };
    expect(sent.messages).toHaveLength(1);
    expect(sent.system).toContain('werkgever');
  });

  it('rejects a transcript that ends with the counterparty', async () => {
    const res = await supertest(app)
      .post('/tools/roleplay')
      .send({ ...scenario, messages: [{ role: 'assistant', content: 'Hallo.' }] });
    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('POST /tools/contract-draft', () => {
  it('returns the drafted paragraphs', async () => {
    createMock.mockResolvedValueOnce(claudeJsonResponse({ title: 'NDA', paragraphs: ['Artikel 1', 'Artikel 2'] }));
    const res = await supertest(app).post('/tools/contract-draft').send({
      contractType: 'nda',
      ownName: 'A',
      counterparty: 'B',
      startDate: '1 oktober 2026',
      description: 'Geheimhouding over een app-idee.',
    });
    expect(res.status).toBe(200);
    expect(res.body.paragraphs).toHaveLength(2);
  });
});
