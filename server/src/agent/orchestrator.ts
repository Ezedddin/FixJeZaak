import type Anthropic from '@anthropic-ai/sdk';
import { db } from '../db.js';
import { anthropic, MODEL } from './claudeClient.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { CLAUDE_TOOL_DEFINITIONS, runTool } from './tools/index.js';

const MAX_TOOL_ITERATIONS = 6;
const HISTORY_LIMIT = 20;

type ClaudeMessage = Anthropic.MessageParam;

/**
 * Runs one user turn through the agent loop and persists the result.
 *
 * Deliberately only persists final `user`/`assistant` TEXT turns to the
 * Message table — intermediate tool_use/tool_result exchanges live only in
 * this call's in-memory message array. On the *next* turn, the model has no
 * lingering tool output to (mis)remember as truth; it must call `get_case`
 * again to ground itself in whatever is actually stored. This is the
 * concrete mechanism behind the "don't treat old info as truth after new
 * documents arrive" requirement.
 */
export async function runAgentTurn(caseId: string, userMessage: string) {
  const kase = await db.case.findUnique({ where: { id: caseId } });
  if (!kase) throw new Error('case_not_found');

  await db.message.create({ data: { caseId, role: 'user', content: userMessage } });

  const history = await db.message.findMany({
    where: { caseId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'asc' },
    take: HISTORY_LIMIT,
  });

  const messages: ClaudeMessage[] = history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  let finalText = '';

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    let response;
    try {
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        tools: CLAUDE_TOOL_DEFINITIONS,
        messages,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[agent] Claude call failed:', error);
      finalText =
        'De AI-assistent is op dit moment niet beschikbaar. Probeer het straks opnieuw, of neem contact op als dit blijft gebeuren.';
      break;
    }

    if (response.stop_reason === 'refusal') {
      finalText =
        'Ik kan dit verzoek niet uitvoeren. Als je denkt dat dit een vergissing is, herformuleer je vraag.';
      break;
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.find((block) => block.type === 'text');
      finalText = textBlock?.text ?? '';
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const { result, isError } = await runTool(toolUse.name, toolUse.input, { caseId });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
        is_error: isError,
      });
    }
    messages.push({ role: 'user', content: toolResults });

    if (iteration === MAX_TOOL_ITERATIONS - 1) {
      finalText =
        'Ik heb meerdere stappen doorlopen maar kon nog geen definitief antwoord vormen. Kun je je vraag preciseren?';
    }
  }

  await db.message.create({ data: { caseId, role: 'assistant', content: finalText } });

  const updatedCase = await db.case.findUnique({
    where: { id: caseId },
    include: { documents: true, actions: true },
  });

  return { reply: finalText, case: updatedCase };
}
