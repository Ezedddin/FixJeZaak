import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { validateBody } from '../middleware/validate.js';
import { toJson } from '../utils/json.js';

export const actionsRouter = Router();

/**
 * The ONLY way an Action can move to "approved". This is a plain REST
 * endpoint the frontend calls when the user taps "Goedkeuren" — it is not a
 * tool the agent can invoke, so the LLM has no path to approving its own
 * output. There is deliberately no "execute externally" step yet (no real
 * CJIB integration); approval only records the user's explicit consent.
 */
const approveSchema = z.object({
  // The final letter text as the user approved it — including their own
  // edits in the preview, which the stored draft doesn't have yet.
  paragraphs: z.array(z.string().min(1).max(5000)).min(1).max(50).optional(),
});

actionsRouter.post('/:caseId/actions/:actionId/approve', validateBody(approveSchema), async (req, res, next) => {
  try {
    const action = await db.action.findUnique({ where: { id: req.params.actionId } });
    if (!action || action.caseId !== req.params.caseId) {
      res.status(404).json({ error: 'action_not_found' });
      return;
    }
    if (action.status !== 'pending_approval') {
      res.status(409).json({ error: 'action_not_pending', status: action.status });
      return;
    }

    const { paragraphs } = req.body as z.infer<typeof approveSchema>;
    const payload = (action.payload as Record<string, unknown> | null) ?? {};
    const updated = await db.action.update({
      where: { id: action.id },
      data: {
        status: 'approved',
        ...(paragraphs ? { payload: toJson({ ...payload, paragraphs, editedByUser: true }) } : {}),
      },
    });
    await db.case.update({ where: { id: req.params.caseId }, data: { status: 'approved' } });

    res.json({ action: updated });
  } catch (error) {
    next(error);
  }
});

actionsRouter.post('/:caseId/actions/:actionId/reject', async (req, res, next) => {
  try {
    const action = await db.action.findUnique({ where: { id: req.params.actionId } });
    if (!action || action.caseId !== req.params.caseId) {
      res.status(404).json({ error: 'action_not_found' });
      return;
    }
    const updated = await db.action.update({
      where: { id: action.id },
      data: { status: 'rejected' },
    });
    res.json({ action: updated });
  } catch (error) {
    next(error);
  }
});

actionsRouter.get('/:caseId/actions/:actionId', async (req, res, next) => {
  try {
    const action = await db.action.findUnique({ where: { id: req.params.actionId } });
    if (!action || action.caseId !== req.params.caseId) {
      res.status(404).json({ error: 'action_not_found' });
      return;
    }
    res.json(action);
  } catch (error) {
    next(error);
  }
});
