import { Router } from 'express';
import { z } from 'zod';
import { callClaudeJSON } from '../agent/claudeClient.js';
import { env } from '../env.js';
import { validateBody } from '../middleware/validate.js';

export const intakeRouter = Router();

const CASE_CATEGORIES = ['boete', 'werk', 'contract', 'wonen', 'aankopen', 'geld', 'overheid', 'anders'] as const;

const classifySchema = z.object({ text: z.string().min(1).max(4000) });

const classificationSchema = z.object({
  category: z.enum(CASE_CATEGORIES),
  title: z.string().min(1).max(80),
});

/** Classifies a free-text problem description into a category + short title,
 * before a case exists. Server-side so the API key never ships in the app. */
intakeRouter.post('/classify', validateBody(classifySchema), async (req, res, next) => {
  try {
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: 'ai_not_configured' });
      return;
    }
    const { text } = req.body as z.infer<typeof classifySchema>;
    const raw = await callClaudeJSON<unknown>({
      system: `Je bent onderdeel van FixJeZaak, een Nederlandse juridische app. Bepaal de meest passende categorie voor de situatie van de gebruiker en bedenk een korte, neutrale Nederlandse titel (max 5 woorden). Antwoord als JSON: {"category": ${CASE_CATEGORIES.map((c) => `"${c}"`).join(' | ')}, "title": string}.`,
      content: `Situatie van de gebruiker:\n"${text}"`,
      maxTokens: 200,
    });
    res.json(classificationSchema.parse(raw));
  } catch (error) {
    next(error);
  }
});
