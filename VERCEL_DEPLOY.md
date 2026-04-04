## Vercel 배포 가이드 (Arthur-App-main)

### 1) 기본 배포
- `npm install` 후 빌드가 되는지 확인
- Vercel CLI 또는 Git 연동 배포 사용

#### CLI
```bash
npm i -g vercel
cd C:\Users\dev\Documents\CODEX\Arthur-App-main
vercel login
vercel link
vercel
vercel --prod
```

#### Git 연동
- GitHub에 push
- Vercel 대시보드에서 `Import Project`
- Framework: **Next.js** (자동 감지)
- Build Command: `npm run build`
- Output Directory: `.next` (기본)

### 2) 환경 변수 등록
대시보드 또는 CLI로 아래 값 등록

필수
- `GEMINI_API_KEY`
- `ENCRYPTION_KEY`

권장
- `GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview`

선택
- `GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview` (품질 위주)

### 3) 지금 바로 점검해야 할 항목
- API 라우트 런타임: `src/app/api/generate/route.ts`에 `export const runtime = 'nodejs'`가 있음
- API 실행 시간 제한: `maxDuration = 60` 설정

### 4) 주의 (중요)
- 현재 DB/이미지 저장이 로컬 파일(`data/db.sqlite`, `public/uploads`) 기반이라, Vercel 배포 후에는 영구 저장이 깨질 수 있습니다.
- 장기 운영은 `PostgreSQL` + 외부 오브젝트 스토리지(예: S3/Blob)로 이전이 필요합니다.

### 5) 배포 후 트러블슈팅
- 빌드 실패: `@google/generative-ai`, `better-sqlite3`, `sharp` 빌드 실패 여부 확인
- API 500: 환경변수 미설정 확인 (`GEMINI_API_KEY`, `ENCRYPTION_KEY`)
- 이미지가 안 보이면 DB/업로드 경로 이슈 (`public/uploads`) 확인
