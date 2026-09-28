import type { Prisma } from '@prisma/client';

/** Prisma's Json fields want `Prisma.InputJsonValue`, which plain domain
 * interfaces/arrays don't structurally satisfy (no index signature). This
 * is a narrow, explicit cast point rather than sprinkling `as any` around
 * every `db.*.update` call. */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
