import path from 'path';
import fs from 'fs';

// 빌드 타임에는 DB 초기화 건너뜀 (SQLITE_BUSY 방지)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

let db: import('better-sqlite3').Database;

if (!isBuildPhase) {
  const Database = require('better-sqlite3');
  const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');

  if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
    fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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
  } catch (e) {
    // 이미 컬럼이 있는 경우 에러 무시
  }

  db.exec(`
    INSERT OR IGNORE INTO settings (id, active_model, active_font, gemini_key, flux_key)
    VALUES ('default', 'gemini', 'notoSansKr', '', '');
  `);
}

export default db!;
