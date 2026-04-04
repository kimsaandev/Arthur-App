# 1. Base image (호환성이 가장 뛰어난 Debian 기반 Slim 버전 사용)
FROM node:20-slim AS base

# 2. Dependencies 설치
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# 3. 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js 빌드 진행 (이때 next.config.ts의 standalone 옵션에 따라 최적화된 결과물이 나옵니다)
RUN npm run build

# 4. 실행 단계 (Standalone 최적화)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 5. 필요한 파일만 복사 (최적화)
# Next.js의 Standalone 결과물(필수 실행 파일과 노드 모듈 요약본)을 루트로 복사
COPY --from=builder /app/.next/standalone ./
# 정적 파일들 복사
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

# 기존 npm start (무거운 패키지 매니저 실행 방식) 대신, 
# 가장 가볍고 직접적인 노드 서버 실행 방식(server.js) 채택
CMD ["node", "server.js"]
