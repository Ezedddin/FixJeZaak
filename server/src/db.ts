import { PrismaClient } from '@prisma/client';

// Single shared Prisma client instance for the process.
export const db = new PrismaClient();
