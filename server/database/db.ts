import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DB_PATH || path.resolve(process.cwd(), 'smarttech.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.resolve(process.cwd(), 'server/database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);

  const userColumns = new Set(
    (db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map((c) => c.name)
  );
  if (!userColumns.has('auth_provider')) {
    db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'");
  }
  if (!userColumns.has('google_uid')) {
    db.exec('ALTER TABLE users ADD COLUMN google_uid TEXT DEFAULT NULL');
  }
  if (!userColumns.has('avatar_url')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL');
  }
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_uid ON users(google_uid) WHERE google_uid IS NOT NULL'
  );

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function setDbForTesting(db: Database.Database | null): void {
  dbInstance = db;
}
