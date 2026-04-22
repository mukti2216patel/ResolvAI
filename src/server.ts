// IMPORTANT: instrument.ts must be the very first import so Sentry can patch
// Node.js internals before any other module loads.
import './instrument';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { db } from "./db";
import { ticketRouter } from './routes/tickets';
import { userRouter } from './routes/users';
import { webhookRouter } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { boss, registerQueueWorkers } from './lib/queue';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy — required when running behind a reverse proxy (Railway, Render, etc.)
// Must be set before any middleware that reads IP addresses (e.g. rate limiters)
app.set('trust proxy', 1);

app.get('/debug-sentry', (_req, res) => {
  throw new Error('Debug sentry error');
});

// --------------- Security Middleware ---------------
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.TRUSTED_ORIGINS || 'http://localhost:5173',
  credentials: true
}));


// Rate Limiting
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'test' ? 10000 : 100, // Limit each IP to 100 requests per windowMs (high for tests)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const authLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // Limit each IP to 10 requests per hour for auth
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Better Auth API Route
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

// --------------- API Routes ---------------
app.use('/api/webhooks', generalLimit, webhookRouter);
app.use('/api/tickets', generalLimit, authMiddleware, ticketRouter);
app.use('/api/users', generalLimit, authMiddleware, userRouter);

app.get('/api/agents', generalLimit, authMiddleware, async (req, res, next) => {
  try {
    const agents = await db.user.findMany({
      where: {
        deletedAt: null,
        email: { not: 'ai@example.com' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// --------------- Static Files (production) ---------------
app.use(express.static(path.join(import.meta.dir, '..', 'client', 'dist')));

// SPA fallback — send index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(import.meta.dir, '..', 'client', 'dist', 'index.html'));
});

// --------------- Error Handler ---------------
// Sentry error handler must be registered BEFORE any custom error middleware.
// It attaches a Sentry event ID to res.sentry for each captured error.
Sentry.setupExpressErrorHandler(app);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  // Report to Sentry (no-op when SENTRY_DSN is not set)
  Sentry.captureException(err);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
    return;
  }

  // Handle Prisma unique constraint violations (P2002)
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'Email already exists' });
    return;
  }

  // Handle Better Auth / Other duplicate email errors
  const message = err.message?.toLowerCase() || '';
  if (message.includes('already exists') || message.includes('unique constraint')) {
    res.status(409).json({ error: 'Email already exists' });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  try {
    await db.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS pgboss;');
    await boss.start();
    console.log('💼 PgBoss queue manager started successfully');
    await registerQueueWorkers();
  } catch (error) {
    console.error('❌ Failed to start PgBoss queue manager:', error);
  }
});

export default app;