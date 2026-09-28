import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { actionsRouter } from './routes/actions.js';
import { assessmentRouter } from './routes/assessment.js';
import { bookingsRouter } from './routes/bookings.js';
import { casesRouter } from './routes/cases.js';
import { chatRouter } from './routes/chat.js';
import { documentsRouter } from './routes/documents.js';
import { intakeRouter } from './routes/intake.js';
import { toolsRouter } from './routes/tools.js';

/** Express app construction, kept separate from `.listen()` so tests can
 * import `app` and drive it with supertest without binding a real port. */
export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, model: env.anthropicModel, aiConfigured: Boolean(env.anthropicApiKey) });
});

app.use('/cases', casesRouter);
app.use('/cases', chatRouter);
app.use('/cases', documentsRouter);
app.use('/cases', actionsRouter);
app.use('/cases', assessmentRouter);
app.use('/intake', intakeRouter);
app.use('/tools', toolsRouter);
app.use('/', bookingsRouter);

app.use(errorHandler);
