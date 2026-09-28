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
  // E-mail via Resend (https://resend.com). Booking e-mails are skipped until
  // RESEND_API_KEY and EMAIL_FROM are set.
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  juristEmails: {
    jurist_hasan: process.env.JURIST_HASAN_EMAIL ?? '',
    jurist_ezeddin: process.env.JURIST_EZEDDIN_EMAIL ?? '',
  } as Record<string, string>,
};

if (!env.anthropicApiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] ANTHROPIC_API_KEY is not set — agent endpoints will return a clear error until it is configured.',
  );
}
