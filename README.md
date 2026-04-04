# Happy Birthday Arthur - Face Swap App

이 프로젝트는 아서의 생일 파티 일러스트(Marc Brown)에 사용자가 업로드한 얼굴을 합성해 주는 Next.js 기반 웹 애플리케이션입니다.

생성된 이미지를 저장하고 갤러리 형태로 전시할 수 있으며, 장기 운영을 위해 **SQLite 데이터베이스**와 **Docker(시놀로지 NAS 지원)** 환경이 최적화되어 있습니다.

## 🚀 주요 기능 및 페이지 안내

애플리케이션을 실행한 후, 아래 주소를 통해 각 페이지에 접근하실 수 있습니다.

- **랜딩 페이지 (얼굴 합성 및 참여)**
  - 접속 주소: [http://localhost:3000](http://localhost:3000)
  - 파티 참여자가 사진을 촬영하고 생성된 결과물을 확인 및 다운로드하는 메인 화면.

- **전시 스크린 (메인 콘텐츠 스크린)**
  - 접속 주소: [http://localhost:3000/result](http://localhost:3000/result)
  - AI로 생성한 사진을 큰 화면으로 확인할 수 있습니다.

- **메인 갤러리 (전체 사진 보기)**
  - 접속 주소: [http://localhost:3000/gallery](http://localhost:3000/gallery)
  - AI로 생성한 사진들을 확인할 수 있습니다. 데이터 증가에 대비하여 축약형 하단 페이지네이션(번호 이동)이 적용되어 있습니다.

- **인스타 갤러리 (정방형 사진 보기)**
  - 접속 주소: [http://localhost:3000/insta-gallery](http://localhost:3000/insta-gallery)
  - 인스타그램 포맷으로 재구성한 이미지 갤러리입니다. 관리자 모드와 삭제, 페이지네이션 기능을 모두 지원합니다.

## ⚙️ 설정 및 실행 방법

### 1단계: 의존성 설치
```bash
npm install
```

### 2단계: 환경 변수 설정 (.env.local)
Google의 Generative AI(NanoBanana/Gemini) 모델을 사용하여 이미지를 편집합니다. 프로젝트 루트에 `.env.local` 파일을 만들고 아래 코드를 추가합니다.
```env
# Google Gemini API Key
GEMINI_API_KEY=your_api_key_here
```

### 3단계: 기본 이미지(템플릿) 준비
- 합성의 기반이 될 "Happy Birthday Arthur" 오리지널 이미지를 준비해야 합니다.
- 원본 일러스트 이미지를 `public/arthur_template.jpg` 경로에 저장하세요.

---

## ▶️ 앱 실행하기 (로컬 환경)

개발 모드로 앱을 실행하려면 다음 명령어를 사용하세요:
```bash
npm run dev
```

운영(프로덕션) 모드로 직접 빌드 및 실행하려면:
```bash
npm run build
npm start
```
서버가 시작되면 브라우저에서 `http://localhost:3000` 을 엽니다.

---

## 🐳 Docker를 이용한 실행 (시놀로지 NAS 권장)

장기 전시를 위해 NAS 환경 등에서 Docker Compose를 사용하여 간단히 배포할 수 있습니다. 이미 제공된 `Dockerfile`과 `docker-compose.yml`을 기반으로 합니다.

```bash
# Docker Compose 백그라운드 실행
docker-compose up -d --build
```
> **데이터베이스 참고**: 이미지 내역은 `db.sqlite` 에 저장됩니다. 도커 환경에서 컨테이너가 내려가더라도 데이터가 날아가지 않도록 `docker-compose.yml` 내부에서 볼륨 매핑이 설정되어 있습니다.

---

## 🛠 커스터마이징 및 관리 전략

- **프롬프트 및 AI 로직**: 
  합성 핵심 로직과 프롬프트는 `src/app/api/generate/route.ts` 에 정의되어 있습니다. 합성 톤앤매너를 수정하려면 이 파일의 프롬프트를 조정하세요.

- **로그 리소스 정리**: 
  메모리 및 저장 공간을 확보하기 위해 자동 청소 기능이 내장되어 있습니다. 수동으로 청소하려면 다음 명령어를 입력하세요. (`logs` 및 `.next/cache` 폴더 내용물이 정리됩니다.)
  ```bash
  npm run cleanup
  ```

- **데이터베이스 관리**: 
  기존의 `db.json` 방식에서 더 안전하고 빠른 **SQLite (`db.sqlite`)** 로 완전히 마이그레이션 되었습니다. 10만 장 이상의 데이터를 안정적으로 처리하며 `better-sqlite3` 패키지를 사용합니다.
