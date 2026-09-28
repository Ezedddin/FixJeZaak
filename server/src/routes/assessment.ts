import { Router } from 'express';
import { z } from 'zod';
import { assessCase } from '../agent/assessCase.js';
import { confirmFacts } from '../agent/facts.js';
import { generateDocumentTool } from '../agent/tools/generateDocument.js';
import { db } from '../db.js';
import { env } from '../env.js';
import { validateBody } from '../middleware/validate.js';

export const assessmentRouter = Router();

const confirmFactsSchema = z.object({
  facts: z.record(z.string().min(1).max(64), z.union([z.string().max(500), z.number()])),
});

/** The user reviewed (and possibly edited) the extracted fields in the app.
 * Plain REST rather than an agent tool: confirmation is a user act, not
 * something the model should be able to do on the user's behalf. */
assessmentRouter.post('/:id/facts/confirm', validateBody(confirmFactsSchema), async (req, res, next) => {
  try {
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    const { facts } = req.body as z.infer<typeof confirmFactsSchema>;
    const result = await confirmFacts(kase.id, facts);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

const analysisSchema = z.object({
  description: z.string().max(4000).optional(),
  hasEvidence: z.boolean(),
});

assessmentRouter.post('/:id/analysis', validateBody(analysisSchema), async (req, res, next) => {
  try {
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: 'ai_not_configured' });
      return;
    }
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    const assessment = await assessCase(kase.id, req.body as z.infer<typeof analysisSchema>);
    res.json(assessment);
  } catch (error) {
    next(error);
  }
});

/** Drafts the case's letter deterministically through the generate_document
 * tool (rule-gated, confirmation-gated, knowledge-grounded) instead of asking
 * the chat agent and hoping it picks that tool. The result is always a
 * pending action that only the explicit /approve endpoint can advance. */
assessmentRouter.post('/:id/letter', async (req, res, next) => {
  try {
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: 'ai_not_configured' });
      return;
    }
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    const result = await generateDocumentTool.handler(
      { caseId: kase.id },
      { caseId: kase.id },
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});
