import type Anthropic from '@anthropic-ai/sdk';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { anthropic, buildDocumentContentBlock, callClaudeJSON, MODEL } from '../agent/claudeClient.js';
import { env } from '../env.js';
import { validateBody } from '../middleware/validate.js';

/**
 * Stand-alone AI tools that don't belong to a case: contract review, contract
 * drafting, and conversation preparation/practice. Stateless — nothing here
 * is stored; the app keeps the result.
 */
export const toolsRouter = Router();

function requireAi(_req: Request, res: Response, next: NextFunction) {
  if (!env.anthropicApiKey) {
    res.status(503).json({ error: 'ai_not_configured' });
    return;
  }
  next();
}

toolsRouter.use(requireAi);

const NOT_ADVICE =
  'Je bent geen advocaat en geeft geen bindend juridisch advies. Noem geen wetsartikelen of uitspraken die je niet zeker weet; als iets afhangt van omstandigheden, zeg dat.';

// --- Contract review --------------------------------------------------------

const CONTRACT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!CONTRACT_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('unsupported_file_type'));
      return;
    }
    cb(null, true);
  },
});

const contractAnalysisSchema = z.discriminatedUnion('readable', [
  z.object({ readable: z.literal(false), reason: z.string() }),
  z.object({
    readable: z.literal(true),
    summary: z.string().min(1),
    clauses: z
      .array(
        z.object({
          title: z.string().min(1),
          risk: z.enum(['hoog', 'gemiddeld', 'laag']),
          explanation: z.string().min(1),
          suggestion: z.string().optional().nullable(),
        }),
      )
      .max(20),
  }),
]);

toolsRouter.post('/contract-analysis', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'no_file_uploaded' });
      return;
    }
    const raw = await callClaudeJSON<unknown>({
      system: `Je bent de contractanalist van FixJeZaak, een Nederlandse app. Je beoordeelt een contract voor een gewone gebruiker.
- Bespreek alleen bepalingen die daadwerkelijk in het document staan; citeer of parafraseer ze, verzin geen bepalingen.
- Geef per relevante bepaling een risico: "hoog" (kan de gebruiker duidelijk benadelen), "gemiddeld" (aandachtspunt) of "laag" (gebruikelijk).
- "suggestion" is een concrete, haalbare aanpassing of actie, of null.
- Als het document onleesbaar is of geen contract is: {"readable": false, "reason": string}.
${NOT_ADVICE}
Antwoord als JSON: {"readable": true, "summary": string, "clauses": [{"title": string, "risk": "hoog"|"gemiddeld"|"laag", "explanation": string, "suggestion": string|null}]}.`,
      content: [
        buildDocumentContentBlock(req.file.mimetype, req.file.buffer.toString('base64')),
        { type: 'text', text: 'Analyseer dit contract. Begin met de bepalingen met het hoogste risico.' },
      ],
      maxTokens: 2500,
    });
    res.json(contractAnalysisSchema.parse(raw));
  } catch (error) {
    next(error);
  }
});

// --- Contract drafting ------------------------------------------------------

const CONTRACT_TYPES = [
  'arbeidsovereenkomst',
  'freelanceovereenkomst',
  'nda',
  'leningsovereenkomst',
  'samenwerkingsovereenkomst',
] as const;

const contractDraftSchema = z.object({
  contractType: z.enum(CONTRACT_TYPES),
  ownName: z.string().trim().min(1).max(200),
  counterparty: z.string().trim().min(1).max(200),
  startDate: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(4000),
});

const draftResultSchema = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1).max(80),
});

toolsRouter.post('/contract-draft', validateBody(contractDraftSchema), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof contractDraftSchema>;
    const raw = await callClaudeJSON<unknown>({
      system: `Je stelt een concept-${input.contractType} op naar Nederlands recht voor FixJeZaak.
- Gebruik alleen de gegevens die de gebruiker geeft. Vul ontbrekende gegevens (bedragen, adressen, termijnen die niet zijn genoemd) NIET zelf in maar zet er [INVULLEN: omschrijving] neer.
- Schrijf helder, zonder onnodig jargon, met genummerde artikelen.
- Sluit af met ruimte voor handtekeningen van beide partijen.
${NOT_ADVICE}
Antwoord als JSON: {"title": string, "paragraphs": string[]} — elk artikel of blok een apart element.`,
      content: `Type contract: ${input.contractType}
Partij 1 (gebruiker): ${input.ownName}
Partij 2 (wederpartij): ${input.counterparty}
Ingangsdatum: ${input.startDate}
Omschrijving van de afspraken: ${input.description}`,
      maxTokens: 4000,
    });
    res.json(draftResultSchema.parse(raw));
  } catch (error) {
    next(error);
  }
});

// --- Conversation preparation & practice ------------------------------------

const scenarioSchema = z.object({
  situation: z.string().trim().min(10).max(4000),
  counterpartyRole: z.string().trim().min(2).max(100),
});

const prepResultSchema = z.object({
  sections: z
    .array(z.object({ title: z.string().min(1), items: z.array(z.string().min(1)).min(1).max(8) }))
    .min(1)
    .max(6),
});

toolsRouter.post('/conversation-prep', validateBody(scenarioSchema), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof scenarioSchema>;
    const raw = await callClaudeJSON<unknown>({
      system: `Je helpt een gebruiker van FixJeZaak een lastig gesprek voor te bereiden. Baseer je volledig op de beschreven situatie; verzin geen feiten over de situatie.
Geef deze secties, in deze volgorde: "Wat je moet bespreken", "Vragen die je kunt stellen", "Wat je beter niet direct accepteert", "Documenten om mee te nemen", "Mogelijke argumenten van de ${input.counterpartyRole}". Maximaal 5 korte punten per sectie.
${NOT_ADVICE}
Antwoord als JSON: {"sections": [{"title": string, "items": string[]}]}.`,
      content: `Gesprek met: ${input.counterpartyRole}\nSituatie: ${input.situation}`,
      maxTokens: 1500,
    });
    res.json(prepResultSchema.parse(raw));
  } catch (error) {
    next(error);
  }
});

const roleplaySchema = scenarioSchema.extend({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .max(40),
});

const ROLEPLAY_START = 'Begin het gesprek met je openingszin.';

/** One turn of a practice conversation: Claude plays the counterparty. The
 * app sends the whole transcript each time; the first call has none and gets
 * the counterparty's opening line. */
toolsRouter.post('/roleplay', validateBody(roleplaySchema), async (req, res, next) => {
  try {
    const input = req.body as z.infer<typeof roleplaySchema>;
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: ROLEPLAY_START },
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    if (messages[messages.length - 1].role === 'assistant') {
      res.status(400).json({ error: 'last_message_must_be_user' });
      return;
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `Dit is een oefengesprek in de app FixJeZaak. Jij speelt de ${input.counterpartyRole}; de gebruiker oefent een lastig gesprek met jou.
Situatie volgens de gebruiker: ${input.situation}
- Blijf in je rol en reageer realistisch: zakelijk, soms kritisch, maar nooit beledigend.
- Antwoord kort (1 tot 3 zinnen), in gewoon Nederlands, zoals in een echt gesprek.
- Verzin geen nieuwe feiten die de situatie wezenlijk veranderen.`,
      messages,
    });
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
    if (!text) throw new Error('no_model_text_response');
    res.json({ reply: text });
  } catch (error) {
    next(error);
  }
});
