// Runs before any test file's imports are evaluated (Vitest `setupFiles`
// contract), so `db.ts`'s `new PrismaClient()` and `env.ts`'s `dotenv.config()`
// both see these values first. `dotenv.config()` never overwrites an
// already-set variable, so this safely shadows the real `.env` for the
// whole test run — tests never touch the dev database or a real API key.
process.env.DATABASE_URL = 'file:./test.db';
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
process.env.ANTHROPIC_MODEL = 'claude-sonnet-5';
process.env.CORS_ORIGIN = '*';
