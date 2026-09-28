import type { NextFunction, Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'unknown_error';
  res.status(500).json({ error: 'internal_error', message });
}
