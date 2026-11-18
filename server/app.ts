import type Database from 'better-sqlite3';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createApiRouter } from './routes/api.ts';
import { createGamesApiRouter } from './routes/gamesApi.ts';

export function createApp(db: Database.Database) {
  const app = express();
  app.disable('x-powered-by');

  // Security headers across all responses
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Explicit CORS policy for API calls
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const configuredUrl = process.env.APP_URL;
    if (origin) {
      const isLocalOrigin =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');
      const matchesAppUrl = Boolean(configuredUrl && origin === configuredUrl.replace(/\/$/, ''));
      if (isLocalOrigin || matchesAppUrl || process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'smart-tech-api' });
  });

  app.use('/api', createApiRouter(db));
  app.use('/api', createGamesApiRouter(db));

  // Structured JSON 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Centralized error handler preventing internal stack trace leaks
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request payload.' });
      return;
    }
    console.error('[server error]', req.method, req.originalUrl, err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
