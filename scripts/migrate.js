const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const jsonPath = path.join(process.cwd(), 'db.json');
const sqlitePath = path.join(process.cwd(), 'db.sqlite');

console.log('--- 기존 JSON 데이터를 SQLite로 마이그레이션 합니다 ---');

if (!fs.existsSync(jsonPath)) {
    console.log('기존 db.json 파일이 존재하지 않습니다. 마이그레이션이 필요 없습니다.');
    process.exit(0);
}

const db = new Database(sqlitePath);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        image TEXT,
        instaImage TEXT,
        completed INTEGER DEFAULT 0,
        timestamp TEXT
    )
`);

const rawData = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(rawData);

if (!data.tasks || data.tasks.length === 0) {
    console.log('db.json에 데이터가 없습니다. 빈 DB로 시작합니다.');
    process.exit(0);
}

const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, image, instaImage, completed, timestamp)
    VALUES (?, ?, ?, ?, ?)
`);

let count = 0;
// 대량의 데이터를 빠르게 넣기 위해 트랜잭션 사용
const migrate = db.transaction((tasks) => {
    for (const task of tasks) {
        const completed = task.completed === true ? 1 : 0;
        insertStmt.run(
            task.id,
            task.image || null,
            task.instaImage || null,
            completed,
            task.timestamp
        );
        count++;
    }
});

try {
    migrate(data.tasks);
    console.log(`✅ 성공적으로 ${count}건의 데이터를 db.sqlite로 이동했습니다!`);
    console.log(`✅ 이제 앱을 재시작하여 SQLite 기반으로 운영할 수 있습니다.`);
} catch (err) {
    console.error('❌ 마이그레이션 실패:', err.message);
}
