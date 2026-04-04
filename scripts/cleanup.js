const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { execSync } = require('child_process');

const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, 'app.log');
const cacheDir = path.join(process.cwd(), '.next', 'cache');

const stateFile = path.join(logDir, 'last-cleanup.json');

function performCleanup(force = false) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timestamp = now.toLocaleTimeString();

    // 오늘 이미 실행했는지 확인 (강제 실행이 아닌 경우)
    if (!force && fs.existsSync(stateFile)) {
        try {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            if (state.lastDate === dateStr) {
                console.log(`[${timestamp}] 이미 오늘(${dateStr}) 유지보수 작업을 완료했습니다.`);
                return;
            }
        } catch (e) {
            console.error('상태 파일 읽기 오류:', e.message);
        }
    }

    console.log(`[${timestamp}] 유지보수 작업을 시작합니다...`);

    // 0. 로그 폴더 생성 확인
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
            console.log(`- 로그 폴더 생성 완료: ${logDir}`);
        } catch (err) {
            console.error(`- 로그 폴더 생성 실패: ${err.message}`);
        }
    }

    // 1. 로그 로테이션
    if (fs.existsSync(logFile)) {
        const rotatedLogFile = path.join(logDir, `app-${dateStr}.log`);
        try {
            fs.renameSync(logFile, rotatedLogFile);
            console.log(`- 로그 로테이션 완료: ${rotatedLogFile}`);
        } catch (err) {
            console.error(`- 로그 로테이션 실패: ${err.message}`);
        }
    }

    // 2. Next.js 캐시 삭제
    if (fs.existsSync(cacheDir)) {
        try {
            // 운영체제 호환성을 위해 Node.js 내장함수 사용
            fs.rmSync(cacheDir, { recursive: true, force: true });
            console.log(`- 캐시 삭제 완료: ${cacheDir}`);
        } catch (err) {
            console.error(`- 캐시 삭제 실패: ${err.message}`);
        }
    }

    // 완료 상태 저장
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ lastDate: dateStr, timestamp: now.toISOString() }));
    } catch (e) {
        console.error('상태 저장 실패:', e.message);
    }
    console.log(`[${timestamp}] 모든 유지보수 작업이 완료되었습니다.`);
}

// 매일 새벽 4시에 실행 (0 4 * * *)
cron.schedule('0 4 * * *', () => {
    performCleanup();
});

// 수동 실행 시에도 작동하도록 내보내기
if (require.main === module) {
    performCleanup();
}

module.exports = { performCleanup };
