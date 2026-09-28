import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

/** Single shared Claude client. Server-side only — the API key never leaves
 * this process, unlike the earlier client-side prototype. */
export const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

export const MODEL = env.anthropicModel;

/** Builds a correctly-typed vision content block for either an image or a
 * PDF, so callers don't have to fight the SDK's discriminated union. */
export function buildDocumentContentBlock(
  mimeType: string,
  base64: string,
): Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  }
  const imageMediaType = (
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
      ? mimeType
      : 'image/jpeg'
  ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  return {
    type: 'image',
    source: { type: 'base64', media_type: imageMediaType, data: base64 },
  };
}

/**
 * Calls Claude and parses the reply as JSON matching `T`. We ask for JSON in
 * the prompt and parse manually rather than relying on a provider-specific
 * structured-output parameter — that keeps this working across SDK/model
 * versions without a hard dependency on one exact feature flag.
 */
export async function callClaudeJSON<T>(params: {
  system: string;
  content: Anthropic.MessageParam['content'];
  maxTokens?: number;
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 800,
    system: `${params.system}\n\nAntwoord UITSLUITEND met geldige JSON, zonder markdown-codeblok en zonder extra tekst.`,
    messages: [{ role: 'user', content: params.content }],
  });
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (!textBlock) throw new Error('no_model_text_response');
  const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  return JSON.parse(cleaned) as T;
}
