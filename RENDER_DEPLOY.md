# Render 배포 가이드 (Arthur-App)

Vercel의 `/var/task`/읽기 전용 문제를 피하고 SQLite 영속 저장소까지 쓰려면 Render가 가장 간단합니다.

## 1) 서비스 연결
- Render에서 새 `Web Service` 생성
- GitHub repo 연결
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

## 2) 실행 포트/환경변수
- Environment Variables
  - `NODE_ENV=production`
  - `ENCRYPTION_KEY=<운영용 암호키>`
  - `GEMINI_API_KEY=<Gemini API Key>`
  - `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview`
  - `DATABASE_PATH=/app/data/db.sqlite`
  - `UPLOAD_DIR=/app/data/uploads`

## 3) 영구 저장소(중요)
- Render에서 `Disk`(예: 1GB) 연결
- Mount Path: `/app/data`
- 위 환경변수 `DATABASE_PATH`를 `/app/data/db.sqlite`로 맞추면 `/app/data`에 SQLite 파일이 저장되어 재배포/재시작 후에도 유지됩니다.

## 4) 배포 확인
- 배포 완료 후 `/api/admin/settings`로 요청해서 저장/조회가 정상 동작하는지 확인
- 오류 시 Render 로그에서 DB 초기화 메시지와 경로를 체크

## 5) (권장) 임시/대체 영속 DB
- 장기적으로는 SQLite 대신 PostgreSQL을 쓰면 더 안정적입니다(설정 화면 저장/조회 API를 DB 어댑터 변경).
