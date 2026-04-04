const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const db = new Database(dbPath);

try {
    // active_font 컬럼 추가 시도
    db.exec("ALTER TABLE settings ADD COLUMN active_font TEXT DEFAULT 'notoSansKr'");
    // 에러 없이 성공하면, 기존 값도 업데이트
    db.prepare("UPDATE settings SET active_font = 'notoSansKr' WHERE active_font IS NULL OR active_font = ''").run();
    console.log("Column 'active_font' successfully added to 'settings' table!");
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log("Column 'active_font' already exists.");
    } else {
        console.error("Migration failed:", error.message);
    }
} finally {
    db.close();
}
