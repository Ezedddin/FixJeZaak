import { z } from 'zod';
import { db } from '../db.js';
import { CASE_TYPES, caseTypeConfig } from '../caseTypes/index.js';
import { knowledgeFor } from '../knowledge/index.js';
import { runRules } from '../rules/engine.js';
import type { CaseFacts, KnowledgeResult, RuleResult } from '../types.js';
import { callClaudeJSON } from './claudeClient.js';
import { evidenceSummaries } from './evidence.js';

const STRENGTHS = ['sterk', 'redelijk', 'zwak', 'onvoldoende_informatie'] as const;

const assessmentSchema = z.object({
  strength: z.enum(STRENGTHS),
  summary: z.string().min(1),
  inFavor: z.array(z.string()),
  potentialIssues: z.array(z.string()),
  counterArgument: z.string(),
  advice: z.string(),
});

export type CaseAssessment = z.infer<typeof assessmentSchema> & {
  ruleFlags: RuleResult[];
  sources: KnowledgeResult[];
};

function describeFacts(facts: CaseFacts): string {
  const entries = Object.entries(facts);
  if (entries.length === 0) return 'geen';
  return entries
    .map(([key, fact]) => `${key}: ${fact.value} (bron: ${fact.source}${fact.needsConfirmation ? ', nog niet bevestigd' : ''})`)
    .join('\n');
}

/**
 * Case-strength assessment, grounded in the stored facts, the deterministic
 * rule results and retrieved knowledge — never in the model's own legal
 * judgement. The rules have the final say on the floor: with blocking rule
 * errors the strength is forced to "onvoldoende_informatie", whatever the
 * model proposed.
 */
export async function assessCase(
  caseId: string,
  input: { description?: string; hasEvidence: boolean },
): Promise<CaseAssessment> {
  const kase = await db.case.findUniqueOrThrow({ where: { id: caseId } });
  const facts = (kase.facts as CaseFacts | null) ?? {};
  const ruleFlags = runRules(kase.caseType, facts);
  const hasBlockingErrors = ruleFlags.some((r) => r.severity === 'error');
  const config = caseTypeConfig(kase.caseType) ?? CASE_TYPES.anders;
  const sources = knowledgeFor(kase.caseType);
  const evidence = await evidenceSummaries(caseId);

  const raw = await callClaudeJSON<unknown>({
    system: `Je bent de juridisch analist van FixJeZaak. Je geeft een nuchtere inschatting van hoe sterk de positie van de gebruiker lijkt in deze zaak (${config.label.toLowerCase()}), UITSLUITEND op basis van de meegegeven feiten, regel-uitkomsten en kennisbronnen.
- Noem in "inFavor" en "potentialIssues" alleen punten die direct volgen uit de feiten, de regel-uitkomsten of het verhaal van de gebruiker. Verzin geen feiten, wetsartikelen of juridische gronden.
- Als er regel-uitkomsten met severity "error" zijn of cruciale gegevens ontbreken, is de strength "onvoldoende_informatie".
- Gebruik geen percentages en geef geen garanties over de uitkomst.
- "advice" is één korte aanbevolen vervolgstap; de app kan een ${config.letter.title.toLowerCase()} voor de gebruiker opstellen.
Antwoord als JSON: {"strength": ${STRENGTHS.map((s) => `"${s}"`).join(' | ')}, "summary": string, "inFavor": string[], "potentialIssues": string[], "counterArgument": string, "advice": string}.`,
    content: `Zaaktype: ${config.label}
Verhaal van de gebruiker: ${input.description?.trim() || 'niet opgegeven'}
Heeft de gebruiker aanvullend bewijs (bijv. een betalingsbewijs, foto's of correspondentie): ${input.hasEvidence ? 'ja' : 'nee'}
${evidence.length > 0 ? `Wat het geüploade bewijs laat zien:\n${evidence.map((e) => `- ${e}`).join('\n')}\n` : ''}
Feiten van de zaak:
${describeFacts(facts)}

Regel-uitkomsten:
${ruleFlags.length > 0 ? ruleFlags.map((r) => `- [${r.severity}] ${r.message}`).join('\n') : 'geen bevindingen'}

Kennisbronnen:
${sources.length > 0 ? sources.map((s) => `- ${s.snippet} (${s.sourceName})`).join('\n') : 'geen relevante bron gevonden'}`,
    maxTokens: 900,
  });

  const parsed = assessmentSchema.parse(raw);
  return {
    ...parsed,
    strength: hasBlockingErrors ? 'onvoldoende_informatie' : parsed.strength,
    ruleFlags,
    sources,
  };
}
