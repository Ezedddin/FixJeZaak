import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { analyzeDocumentTool } from '../agent/tools/analyzeDocument.js';
import { extractCaseInformationTool } from '../agent/tools/extractCaseInformation.js';
import { summarizeExtraction } from '../agent/summarize.js';
import { db } from '../db.js';
import { env } from '../env.js';
import { ensureUploadDir, UPLOAD_DIR } from '../storage/fileStorage.js';
import type { CaseFacts } from '../types.js';

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

    const reply = summarizeExtraction(extraction.mergedFacts, extraction.fieldsNeedingConfirmation ?? []);
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
