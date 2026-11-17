import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createApp } from './server/app.ts';
import { getDb } from './server/database/db.ts';
import { seedDatabaseIfEmpty } from './server/database/seed.ts';

async function startServer() {
  const db = getDb();
  seedDatabaseIfEmpty(db);

  const app = createApp(db);
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart-Tech server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Smart-Tech server:', err);
  process.exit(1);
});
