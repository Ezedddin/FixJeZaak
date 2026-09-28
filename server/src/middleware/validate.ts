import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/** Generic request-body validator. Every route that accepts a body uses
 * this — user/client input is never passed straight into a Prisma call or
 * the agent without a schema check first. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'invalid_request', details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}
