export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            // Next.js 빌더가 해석 가능하도록 명시적인 상대 경로 사용
            const cleanupModule = require('../scripts/cleanup.js');
            if (cleanupModule && cleanupModule.performCleanup) {
                console.log('[Instrumentation] 서버 부팅 시 유지보수 상태를 체크합니다.');
                cleanupModule.performCleanup();
            }
        } catch (e) {
            console.warn('[Instrumentation] 유지보수 스크립트를 로드할 수 없습니다 (빌드 또는 환경 차이):', e);
        }
    }
}
