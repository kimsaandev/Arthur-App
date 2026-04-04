import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 1. 이미지 최적화 끄기 (나스 외부 폴더에 저장된 파일들을 그대로 표시하도록 허용)
  images: {
    unoptimized: true,
  },
  // 2. trailingSlash 엄격 관리 (PC 브라우저의 404 라우팅 에러 방지)
  trailingSlash: false,

  // 3. 정적 캐싱 우회 인터셉트: 모든 uploads 요청을 위에서 만든 동적 API로 강제 토스
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: '/api/uploads/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
