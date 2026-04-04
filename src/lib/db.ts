import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 데이터베이스 파일 경로 설정 (도커 환경 고려: /app/data/db.sqlite)
const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');

// data 폴더가 없으면 생성
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// DB 인스턴스 생성 (자동으로 파일 생성됨)
const db = new Database(dbPath);

// 초기 테이블 스키마 생성 (앱 시작 시 최초 1회 작동)
// WAL(Write-Ahead Logging) 모드 활성화로 동시성 및 쓰기 성능 최적화
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

// 마이그레이션: active_font 컬럼이 없으면 추가
try {
  db.exec("ALTER TABLE settings ADD COLUMN active_font TEXT DEFAULT 'notoSansKr'");
} catch (e) {
  // 이미 컬럼이 있는 경우 에러 무시
}

db.exec(`
  INSERT OR IGNORE INTO settings (id, active_model, active_font, gemini_key, flux_key) 
  VALUES ('default', 'gemini', 'notoSansKr', '', '');
`);

export default db;
