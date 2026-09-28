import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { env } from '../env.js';
import { validateBody } from '../middleware/validate.js';
import { BOOKING_OPTIONS, PROFESSIONAL_IDS, PROFESSIONALS } from '../professionals.js';

export const bookingsRouter = Router();

bookingsRouter.get('/professionals', (_req, res) => {
  res.json(PROFESSIONALS);
});

const createBookingSchema = z.object({
  userId: z.string().min(1).max(100),
  professionalId: z.enum(PROFESSIONAL_IDS as [string, ...string[]]),
  option: z.enum(BOOKING_OPTIONS),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  question: z.string().trim().min(1).max(4000),
});

bookingsRouter.post('/bookings', validateBody(createBookingSchema), async (req, res, next) => {
  try {
    const booking = await db.booking.create({ data: req.body as z.infer<typeof createBookingSchema> });
    res.status(201).json({ id: booking.id, status: booking.status });
  } catch (error) {
    next(error);
  }
});

/** Lets the juristen see incoming requests. Contains personal data, so it is
 * disabled unless ADMIN_TOKEN is configured, and requires that token. */
bookingsRouter.get('/bookings', async (req, res, next) => {
  try {
    if (!env.adminToken || req.header('x-admin-token') !== env.adminToken) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const bookings = await db.booking.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});
