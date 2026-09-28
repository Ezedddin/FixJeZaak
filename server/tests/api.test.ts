import { beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
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
const { app } = await import('../src/app.js');
const { generateDocumentTool } = await import('../src/agent/tools/generateDocument.js');
const { TOOLS } = await import('../src/agent/tools/index.js');

const createMock = anthropic.messages.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  createMock.mockReset();
});

describe('scenario 7: case, document and fact persistence across requests', () => {
  it('creates a case via POST /cases and reads it back unchanged via GET', async () => {
    const created = await supertest(app).post('/cases').send({ userId: 'u1', caseType: 'boete' });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();

    const fetched = await supertest(app).get(`/cases/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(created.body.id);
    expect(fetched.body.status).toBe('collecting_info');
  });

  it('persists extracted facts from a document upload so a later GET reflects them', async () => {
    const created = await supertest(app).post('/cases').send({ userId: 'u1', caseType: 'boete' });
    const caseId = created.body.id as string;

    createMock
      .mockResolvedValueOnce(
        claudeJsonResponse({ readable: true, documentType: 'verkeersboete', notes: 'Duidelijk leesbaar.' }),
      )
      .mockResolvedValueOnce(
        claudeJsonResponse({
          authority: 'CJIB',
          offence: 'speeding',
          fine_amount: 240,
          reference_number: 'CJIB-1',
          confidence: { authority: 0.95, offence: 0.95, fine_amount: 0.95, reference_number: 0.95 },
        }),
      );

    const upload = await supertest(app)
      .post(`/cases/${caseId}/documents`)
      .attach('file', Buffer.from('fake image bytes'), { filename: 'boete.jpg', contentType: 'image/jpeg' });

    expect(upload.status).toBe(201);
    expect(upload.body.case.facts.fine_amount.value).toBe(240);

    const refetched = await supertest(app).get(`/cases/${caseId}`);
    expect(refetched.body.facts.fine_amount.value).toBe(240);
    expect(refetched.body.documents).toHaveLength(1);
  });

  it('rejects an upload with an unsupported file type before it touches storage', async () => {
    const created = await supertest(app).post('/cases').send({ userId: 'u1', caseType: 'boete' });
    const response = await supertest(app)
      .post(`/cases/${created.body.id}/documents`)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), { filename: 'script.sh', contentType: 'application/x-sh' });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('validates the request body and never reaches the database on bad input', async () => {
    const response = await supertest(app).post('/cases').send({ caseType: 'boete' }); // missing userId
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_request');
  });
});

describe('scenario 10: nothing can be approved except through the explicit human-approval endpoint', () => {
  it('has no agent tool capable of approving its own output', () => {
    const approvalLikeTool = TOOLS.find((tool) => /approve/i.test(tool.name));
    expect(approvalLikeTool).toBeUndefined();
  });

  it('moves a generated action from pending_approval to approved only via POST .../approve', async () => {
    const kase = await createTestCase({
      facts: {
        authority: { value: 'CJIB', source: 'document', needsConfirmation: false },
        offence: { value: 'speeding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'ABC123', source: 'document', needsConfirmation: false },
        fine_amount: { value: 240, source: 'document', needsConfirmation: false },
      },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,'] }));
    const generated = (await generateDocumentTool.handler(
      { caseId: kase.id, documentType: 'bezwaarschrift' },
      { caseId: kase.id },
    )) as { actionId: string };

    const beforeApproval = await supertest(app).get(`/cases/${kase.id}/actions/${generated.actionId}`);
    expect(beforeApproval.body.status).toBe('pending_approval');

    const approved = await supertest(app).post(`/cases/${kase.id}/actions/${generated.actionId}/approve`);
    expect(approved.status).toBe(200);
    expect(approved.body.action.status).toBe('approved');

    const caseAfter = await supertest(app).get(`/cases/${kase.id}`);
    expect(caseAfter.body.status).toBe('approved');
  });

  it('refuses to approve the same action twice', async () => {
    const kase = await createTestCase({
      facts: {
        authority: { value: 'CJIB', source: 'document', needsConfirmation: false },
        offence: { value: 'speeding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'ABC123', source: 'document', needsConfirmation: false },
        fine_amount: { value: 240, source: 'document', needsConfirmation: false },
      },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,'] }));
    const generated = (await generateDocumentTool.handler(
      { caseId: kase.id, documentType: 'bezwaarschrift' },
      { caseId: kase.id },
    )) as { actionId: string };

    const first = await supertest(app).post(`/cases/${kase.id}/actions/${generated.actionId}/approve`);
    expect(first.status).toBe(200);

    const second = await supertest(app).post(`/cases/${kase.id}/actions/${generated.actionId}/approve`);
    expect(second.status).toBe(409);
  });

  it('returns 404 rather than approving an action that belongs to a different case', async () => {
    const kaseA = await createTestCase();
    const kaseB = await createTestCase({
      facts: {
        authority: { value: 'CJIB', source: 'document', needsConfirmation: false },
        offence: { value: 'speeding', source: 'document', needsConfirmation: false },
        reference_number: { value: 'ABC123', source: 'document', needsConfirmation: false },
        fine_amount: { value: 240, source: 'document', needsConfirmation: false },
      },
    });
    createMock.mockResolvedValueOnce(claudeJsonResponse({ paragraphs: ['Geachte heer/mevrouw,'] }));
    const generated = (await generateDocumentTool.handler(
      { caseId: kaseB.id, documentType: 'bezwaarschrift' },
      { caseId: kaseB.id },
    )) as { actionId: string };

    const response = await supertest(app).post(`/cases/${kaseA.id}/actions/${generated.actionId}/approve`);
    expect(response.status).toBe(404);
  });
});
