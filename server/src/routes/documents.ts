import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { buildDocumentContentBlock, callClaudeJSON } from '../agent/claudeClient.js';
import { analyzeDocumentTool } from '../agent/tools/analyzeDocument.js';
import { extractCaseInformationTool } from '../agent/tools/extractCaseInformation.js';
import { summarizeExtraction } from '../agent/summarize.js';
import { caseTypeConfig } from '../caseTypes/index.js';
import { db } from '../db.js';
import { env } from '../env.js';
import { ensureUploadDir, UPLOAD_DIR } from '../storage/fileStorage.js';
import { knowledgeFor } from '../knowledge/index.js';
import type { CaseFacts } from '../types.js';
import { toJson } from '../utils/json.js';

export const documentsRouter = Router();

await ensureUploadDir();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('unsupported_file_type'));
      return;
    }
    cb(null, true);
  },
});

interface DocumentUnderstanding {
  readable: boolean;
  documentType: string;
  notes: string;
}

interface ExtractionResult {
  error?: string;
  mergedFacts?: CaseFacts;
  fieldsNeedingConfirmation?: string[];
}

documentsRouter.post('/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'no_file_uploaded' });
      return;
    }

    const document = await db.document.create({
      data: {
        caseId: kase.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        storagePath: req.file.path,
      },
    });

    if (!env.anthropicApiKey) {
      res.status(201).json({ document, analysis: null, warning: 'ai_not_configured' });
      return;
    }

    // Stage 1: is it readable at all? Fail fast and clearly if not, rather
    // than pushing an unreadable document into structured extraction.
    const understanding = (await analyzeDocumentTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as DocumentUnderstanding;

    if (!understanding.readable) {
      const message = `Ik kan dit document niet betrouwbaar lezen (${
        understanding.notes || 'onbekende reden'
      }). Kun je opnieuw uploaden, bij voorkeur een scherpere foto of scan?`;
      await db.message.create({ data: { caseId: kase.id, role: 'assistant', content: message } });
      res.status(201).json({ document, analysis: understanding, reply: message });
      return;
    }

    // Stage 2: structured extraction, with confidence-tiered trust.
    const extraction = (await extractCaseInformationTool.handler(
      { caseId: kase.id, documentId: document.id },
      { caseId: kase.id },
    )) as ExtractionResult;

    if (extraction.error || !extraction.mergedFacts) {
      const message =
        'Ik kon geen gegevens uit dit document halen. Kun je een duidelijkere foto of scan uploaden?';
      await db.message.create({ data: { caseId: kase.id, role: 'assistant', content: message } });
      res.status(201).json({ document, analysis: understanding, extraction, reply: message });
      return;
    }

    const reply = summarizeExtraction(kase.caseType, extraction.mergedFacts, extraction.fieldsNeedingConfirmation ?? []);
    await db.message.create({ data: { caseId: kase.id, role: 'assistant', content: reply } });

    const updatedCase = await db.case.findUnique({
      where: { id: kase.id },
      include: { documents: true, actions: true },
    });

    res.status(201).json({ document, analysis: understanding, extraction, reply, case: updatedCase });
  } catch (error) {
    next(error);
  }
});

const evidenceSchema = z.object({ readable: z.boolean(), summary: z.string() });

/** Supporting evidence (payment proof, photos, correspondence). The model
 * only describes what the file shows; that description then grounds the
 * assessment and the letter. */
documentsRouter.post('/:id/evidence', upload.single('file'), async (req, res, next) => {
  try {
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'no_file_uploaded' });
      return;
    }
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: 'ai_not_configured' });
      return;
    }

    const base64 = (await fs.readFile(req.file.path)).toString('base64');
    const result = evidenceSchema.parse(
      await callClaudeJSON<unknown>({
        system:
          'Je beschrijft kort en feitelijk wat een bewijsstuk laat zien (bijv. een betalingsbewijs met datum, tijd en bedrag, een foto van een situatie, of een e-mail met datum en afzender). Trek geen juridische conclusies en vul niets aan wat niet zichtbaar is. Is het onleesbaar, zet readable dan op false. Antwoord als JSON: {"readable": boolean, "summary": string}.',
        content: [
          buildDocumentContentBlock(req.file.mimetype, base64),
          { type: 'text', text: `Dit bewijsstuk hoort bij een zaak over: ${caseTypeConfig(kase.caseType)?.label ?? kase.caseType}.` },
        ],
        maxTokens: 400,
      }),
    );

    if (!result.readable) {
      res.status(200).json({ readable: false });
      return;
    }

    const document = await db.document.create({
      data: {
        caseId: kase.id,
        kind: 'evidence',
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        storagePath: req.file.path,
        extracted: toJson({ evidenceSummary: result.summary }),
      },
    });
    res.status(201).json({ readable: true, documentId: document.id, summary: result.summary });
  } catch (error) {
    next(error);
  }
});

const responseSchema = z.object({
  readable: z.boolean(),
  outcome: z.enum(['toegewezen', 'deels_toegewezen', 'afgewezen', 'onduidelijk']),
  summary: z.string(),
  reasons: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

/** The other party's reply to the user's letter. The model reads what the
 * reply says; next steps may only come from the case type's knowledge
 * sources, never from the model's own legal judgement. */
documentsRouter.post('/:id/response', upload.single('file'), async (req, res, next) => {
  try {
    const kase = await db.case.findUnique({ where: { id: req.params.id } });
    if (!kase) {
      res.status(404).json({ error: 'case_not_found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'no_file_uploaded' });
      return;
    }
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: 'ai_not_configured' });
      return;
    }

    const knowledge = knowledgeFor(kase.caseType);
    const facts = (kase.facts as CaseFacts | null) ?? {};
    const base64 = (await fs.readFile(req.file.path)).toString('base64');
    const result = responseSchema.parse(
      await callClaudeJSON<unknown>({
        system: `Je leest de reactie van de wederpartij op een brief van de gebruiker van FixJeZaak en legt die eenvoudig uit.
- "outcome": wordt het verzoek van de gebruiker toegewezen, deels toegewezen, afgewezen, of is dat onduidelijk?
- "summary" en "reasons": alleen wat er daadwerkelijk in de reactie staat.
- "nextSteps": mogelijke vervolgstappen, UITSLUITEND gebaseerd op de meegegeven kennisbronnen of op wat de reactie zelf zegt (bijv. een genoemde beroepstermijn). Is daar niets over bekend, geef dan een lege lijst.
- Is het document onleesbaar, zet readable op false.
Antwoord als JSON: {"readable": boolean, "outcome": "toegewezen"|"deels_toegewezen"|"afgewezen"|"onduidelijk", "summary": string, "reasons": string[], "nextSteps": string[]}.`,
        content: [
          buildDocumentContentBlock(req.file.mimetype, base64),
          {
            type: 'text',
            text: `Gegevens van de zaak:\n${Object.entries(facts).map(([k, f]) => `${k}: ${f.value}`).join('\n') || 'geen'}\n\nKennisbronnen:\n${
              knowledge.map((k) => `- ${k.snippet} (${k.sourceName})`).join('\n') || 'geen'
            }`,
          },
        ],
        maxTokens: 1200,
      }),
    );

    if (!result.readable) {
      res.status(200).json({ readable: false });
      return;
    }

    const { readable: _readable, ...analysis } = result;
    await db.document.create({
      data: {
        caseId: kase.id,
        kind: 'response',
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        storagePath: req.file.path,
        extracted: toJson({ responseAnalysis: analysis }),
      },
    });
    await db.case.update({ where: { id: kase.id }, data: { status: 'response_received' } });
    res.status(201).json({ readable: true, ...analysis, sources: knowledge });
  } catch (error) {
    next(error);
  }
});
