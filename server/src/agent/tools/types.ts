export interface ToolContext {
  caseId: string;
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  /** JSON schema handed to Claude as the tool's `input_schema`. */
  inputSchema: Record<string, unknown>;
  /** Server-side validation of the model's tool call — this is the gate the
   * spec requires: the LLM's output is never trusted or executed as-is. */
  validate: (raw: unknown) => TInput;
  handler: (input: TInput, ctx: ToolContext) => Promise<object>;
}

/** Thrown by `validate()` so the orchestrator can turn it into a tool_result
 * with `is_error: true` instead of crashing the request. */
export class ToolValidationError extends Error {}
