import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Runs once before the whole test run: (re)creates a dedicated SQLite test
 * database via `prisma db push`, separate from the dev.db used by the
 * running server, so tests never touch real/manually-created data.
 */
export default function globalSetup() {
  const serverRoot = path.resolve(import.meta.dirname, '..');
  const dbFile = path.resolve(serverRoot, 'prisma/test.db');

  for (const suffix of ['', '-journal', '-shm', '-wal']) {
    const file = dbFile + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  execSync('npx prisma db push --skip-generate --schema=prisma/schema.prisma', {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'inherit',
  });
}
