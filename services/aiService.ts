import type { CaseCategory, ChatMessage, ChatOption } from '@/types';
import { withDelay } from '@/utils/async';
import { generateId } from '@/utils/id';
import { backendClient } from './backendClient';

const CASE_CATEGORIES: CaseCategory[] = [
  'boete',
  'werk',
  'contract',
  'wonen',
  'aankopen',
  'geld',
  'overheid',
  'anders',
];

const CATEGORY_KEYWORDS: Array<{ category: CaseCategory; keywords: string[] }> = [
  { category: 'boete', keywords: ['boete', 'parkeer', 'flits', 'bekeuring', 'verkeer', 'naheffing'] },
  { category: 'werk', keywords: ['ontslag', 'baas', 'werkgever', 'loon', 'salaris', 'contract werk'] },
  { category: 'wonen', keywords: ['huur', 'verhuurder', 'borg', 'woning', 'appartement'] },
  { category: 'aankopen', keywords: ['garantie', 'webshop', 'besteld', 'retour', 'abonnement', 'product'] },
  { category: 'geld', keywords: ['betaling', 'schuld', 'incasso', 'factuur', 'geld terug'] },
  { category: 'overheid', keywords: ['gemeente', 'belasting', 'besluit', 'toeslag', 'uwv'] },
  { category: 'contract', keywords: ['contract', 'overeenkomst', 'nda', 'zzp'] },
];

function guessCategory(text: string): CaseCategory {
  const lower = text.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => lower.includes(keyword))) {
      return entry.category;
    }
  }
  return 'anders';
}

function titleFor(category: CaseCategory, text: string): string {
  const titles: Record<CaseCategory, string> = {
    boete: 'Boete',
    werk: 'Werksituatie',
    contract: 'Contractcontrole',
    wonen: 'Woonkwestie',
    aankopen: 'Aankoopgeschil',
    geld: 'Betalingskwestie',
    overheid: 'Overheidsbesluit',
    anders: 'Nieuwe zaak',
  };
  if (text.trim().length > 0 && text.trim().length < 40) return text.trim();
  return titles[category];
}

export interface IntakeInterpretation {
  category: CaseCategory;
  title: string;
}

/** Keyword-based category guess, used when the backend is unavailable. */
function interpretProblemLocally(text: string): IntakeInterpretation {
  const category = guessCategory(text);
  return { category, title: titleFor(category, text) };
}

/** Classifies a free-text problem description into a category + short title
 * via the backend; falls back to the keyword guess when it is unavailable. */
async function interpretProblem(text: string): Promise<IntakeInterpretation> {
  if (!backendClient.isConfigured) return interpretProblemLocally(text);

  try {
    const result = await backendClient.classifyIntake(text);
    const category = CASE_CATEGORIES.find((c) => c === result.category) ?? guessCategory(text);
    return { category, title: result.title };
  } catch {
    return interpretProblemLocally(text);
  }
}

interface ScriptStep {
  id: string;
  question: string;
  options: ChatOption[];
}

const BOETE_SCRIPT: ScriptStep[] = [
  {
    id: 'betalingsbewijs',
    question: "Heb je bewijs dat jouw kant ondersteunt, zoals een betalingsbewijs of foto's?",
    options: [
      { label: 'Ja', value: 'ja' },
      { label: 'Nee', value: 'nee' },
    ],
  },
  {
    id: 'beschikking',
    question: 'Heb je de beschikking beschikbaar?',
    options: [
      { label: 'Foto maken', value: 'foto' },
      { label: 'Document uploaden', value: 'upload' },
      { label: 'Niet bij de hand', value: 'geen' },
    ],
  },
];

const GENERIC_SCRIPT: ScriptStep[] = [
  {
    id: 'documenten',
    question: 'Heb je hier documenten of correspondentie over?',
    options: [
      { label: 'Ja', value: 'ja' },
      { label: 'Nee', value: 'nee' },
    ],
  },
  {
    id: 'deadline',
    question: 'Is er een deadline of reactietermijn waar je rekening mee moet houden?',
    options: [
      { label: 'Ja', value: 'ja' },
      { label: 'Nee, niet dat ik weet', value: 'nee' },
    ],
  },
];

function scriptFor(category: CaseCategory): ScriptStep[] {
  return category === 'boete' ? BOETE_SCRIPT : GENERIC_SCRIPT;
}

/** Returns the next scripted intake question, or null when the mini-script is complete. */
async function getNextIntakeQuestion(
  category: CaseCategory,
  answeredStepIds: string[],
): Promise<ChatMessage | null> {
  const script = scriptFor(category);
  const next = script.find((step) => !answeredStepIds.includes(step.id));
  if (!next) return withDelay(null, 500);
  const message: ChatMessage = {
    id: generateId('msg'),
    sender: 'assistant',
    text: next.question,
    createdAt: new Date().toISOString(),
    options: next.options,
  };
  return withDelay(message, 900);
}

function intakeStepId(category: CaseCategory, index: number): string | undefined {
  return scriptFor(category)[index]?.id;
}


/**
 * Answers a user's question through the real backend agent (tool use,
 * rules, `get_case`-grounded — never trusts stale in-context facts). Returns
 * null (not a thrown error) on any failure.
 */
async function askCaseAssistantViaBackend(backendCaseId: string, question: string): Promise<string | null> {
  try {
    const result = await backendClient.sendMessage(backendCaseId, question);
    return result.reply || null;
  } catch {
    return null;
  }
}

/** Answers a user's question about their case via the backend agent. */
async function askCaseAssistant(question: string, backendCaseId?: string): Promise<string> {
  if (backendCaseId) {
    const viaBackend = await askCaseAssistantViaBackend(backendCaseId, question);
    if (viaBackend) return viaBackend;
  }
  return 'De assistent is op dit moment niet bereikbaar. Controleer je internetverbinding en probeer het zo opnieuw.';
}

export const aiService = {
  interpretProblem,
  getNextIntakeQuestion,
  intakeStepId,
  askCaseAssistant,
};
