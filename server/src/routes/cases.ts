import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { validateBody } from '../middleware/validate.js';

export const casesRouter = Router();

const createCaseSchema = z.object({
  userId: z.string().min(1),
  caseType: z.string().min(1).default('boete'),
});

casesRouter.post('/', validateBody(createCaseSchema), async (req, res, next) => {
  try {
    const { userId, caseType } = req.body as z.infer<typeof createCaseSchema>;
    const kase = await db.case.create({ data: { userId, caseType } });
    res.status(201).json(kase);
  } catch (error) {
    next(error);
  }
});

casesRouter.get('/', async (req, res, next) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const cases = await db.case.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(cases);
  } catch (error) {
    next(error);
  }
});

casesRouter.get('/:id', async (req, res, next) => {
  try {
    const kase = await db.case.findUnique({
      where: { id: req.params.id },
      include: {
        documents: true,
        actions: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    res.json(kase);
  } catch (error) {
    next(error);
  }
});
