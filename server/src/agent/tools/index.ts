import type Anthropic from '@anthropic-ai/sdk';
import { analyzeDocumentTool } from './analyzeDocument.js';
import { askUserTool } from './askUser.js';
import { extractCaseInformationTool } from './extractCaseInformation.js';
import { generateDocumentTool } from './generateDocument.js';
import { getCaseTool } from './getCase.js';
import { prepareActionTool } from './prepareAction.js';
import { searchKnowledgeTool } from './searchKnowledge.js';
import { ToolValidationError, type ToolContext, type ToolDefinition } from './types.js';
import { updateCaseTool } from './updateCase.js';
import { validateCaseTool } from './validateCase.js';

export const TOOLS: ToolDefinition[] = [
  analyzeDocumentTool,
  extractCaseInformationTool,
  validateCaseTool,
  searchKnowledgeTool,
  generateDocumentTool,
  getCaseTool,
  updateCaseTool,
  askUserTool,
  prepareActionTool,
] as ToolDefinition[];

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

/** Anthropic tool definitions for the Messages API request. Each tool's
 * `inputSchema` is authored as a plain JSON schema object (so it can double
 * as documentation and be hand-written alongside its zod validator); it's
 * cast to the SDK's stricter `InputSchema` type here at the one seam where
 * that matters. */
export const CLAUDE_TOOL_DEFINITIONS: Anthropic.Tool[] = TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
}));

/**
 * Validates and executes a single tool call. This is the enforcement point
 * the spec requires: the LLM's proposed input is never trusted directly —
 * every call is parsed against a strict schema, and the caseId is always
 * pinned to the case this conversation belongs to (a model can't address a
 * different case just because it said so).
 */
export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<{ result: unknown; isError: boolean }> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) {
    return { result: { error: `unknown_tool: ${name}` }, isError: true };
  }

  try {
    const input = tool.validate({ ...(rawInput as Record<string, unknown>), caseId: ctx.caseId });
    const result = await tool.handler(input, ctx);
    return { result, isError: false };
  } catch (error) {
    if (error instanceof ToolValidationError) {
      return { result: { error: 'invalid_tool_input', message: error.message }, isError: true };
    }
    return { result: { error: 'tool_execution_failed', message: (error as Error).message }, isError: true };
  }
}
