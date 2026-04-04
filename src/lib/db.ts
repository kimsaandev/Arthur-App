import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbStartupError: string | null = null;
const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const dataDir = path.join(process.cwd(), 'data');
const isVercel = process.env.VERCEL === '1';
const resolvedDataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const resolvedDbPath = isVercel ? path.join('/tmp', 'db.sqlite') : path.join(process.cwd(), 'data', 'db.sqlite');

const createSchema = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      image TEXT,
      instaImage TEXT,
      completed INTEGER DEFAULT 0,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      active_model TEXT DEFAULT 'gemini',
      gemini_key TEXT,
      flux_key TEXT
    );
  `);

  try {
    db.exec("ALTER TABLE settings ADD COLUMN active_font TEXT DEFAULT 'notoSansKr'");
  } catch {
    // ignore if already exists
  }

  db.exec(`
    INSERT OR IGNORE INTO settings (id, active_model, active_font, gemini_key, flux_key)
    VALUES ('default', 'gemini', 'notoSansKr', '', '');
  `);
};

const createFallbackDb = () => {
  const fallbackDb = new Database(':memory:');
  createSchema(fallbackDb);
  console.warn(
    '[DB] SQLite file DB init failed. Fallback to in-memory DB. In Vercel, local DB persistence is not recommended.'
  );
  return fallbackDb;
};

let db: Database.Database;

try {
  if (!fs.existsSync(resolvedDataDir)) {
    fs.mkdirSync(resolvedDataDir, { recursive: true });
  }
  db = new Database(resolvedDbPath);
  createSchema(db);
} catch (error: any) {
  dbStartupError = error?.message || 'SQLite init failed';
  console.error('[DB] Failed to initialize file-based SQLite DB:', dbStartupError);
  db = createFallbackDb();
}

export { dbStartupError };
export default db;
