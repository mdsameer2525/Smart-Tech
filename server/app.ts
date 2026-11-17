import type Database from 'better-sqlite3';
import express from 'express';
import { createApiRouter } from './routes/api.ts';

export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'smart-tech-api' });
  });

  app.use('/api', createApiRouter(db));

  return app;
}
