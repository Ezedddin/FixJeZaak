import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env.js';
import { runAgentTurn } from '../agent/orchestrator.js';
import { db } from '../db.js';
import { validateBody } from '../middleware/validate.js';

export const chatRouter = Router();

const sendMessageSchema = z.object({ message: z.string().min(1).max(4000) });

chatRouter.post('/:id/messages', validateBody(sendMessageSchema), async (req, res, next) => {
  try {
    if (!env.anthropicApiKey) {
      res.status(503).json({
        error: 'ai_not_configured',
        message: 'De AI-assistent is momenteel niet beschikbaar (geen API-key geconfigureerd).',
      });
      return;
    }

    const { message } = req.body as z.infer<typeof sendMessageSchema>;
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }

    const { reply, case: updatedCase } = await runAgentTurn(req.params.id, message);
    res.json({ reply, case: updatedCase });
  } catch (error) {
    next(error);
  }
});

chatRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const messages = await db.message.findMany({
      where: { caseId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});
