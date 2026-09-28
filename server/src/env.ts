import 'dotenv/config';

/**
 * Central, provider-agnostic AI configuration. Everything downstream reads
 * the model name from here rather than hardcoding it, so bumping the model
 * (or swapping provider later) is a one-line change.
 */
export const env = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  adminToken: process.env.ADMIN_TOKEN ?? '',
};

if (!env.anthropicApiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] ANTHROPIC_API_KEY is not set — agent endpoints will return a clear error until it is configured.',
  );
}
