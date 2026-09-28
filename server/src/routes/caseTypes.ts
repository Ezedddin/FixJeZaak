import { Router } from 'express';
import { caseTypeConfig } from '../caseTypes/index.js';

export const caseTypesRouter = Router();

/** The app's review and letter screens are driven by this: which fields to
 * show, which are required, and what the letter is called. */
caseTypesRouter.get('/:id', (req, res) => {
  const config = caseTypeConfig(req.params.id);
  if (!config) {
    res.status(404).json({ error: 'unknown_case_type' });
    return;
  }
  res.json({
    id: config.id,
    label: config.label,
    documentHint: config.documentHint,
    fields: config.fields,
    requiredFields: config.requiredFields,
    recipientField: config.recipientField,
    referenceField: config.referenceField ?? null,
    deadlineField: config.deadlineField ?? null,
    letterTitle: config.letter.title,
  });
});
