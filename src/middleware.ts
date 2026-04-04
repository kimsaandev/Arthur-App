import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. 제외할 경로 설정 (미들웨어가 관여하지 않음)
// API 라우트, 정적 리소스, 이미지 업로드, 그리고 /unauthorized 페이지 등
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - uploads (uploaded images)
         * - images (static assets or arthur_template, etc)
         * - unauthorized (access denied page)
         * - result, gallery, admin (관리자 및 전시용 고정 페이지)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|uploads|images|unauthorized|result|gallery|admin|.*\\..*).*)',
    ],
};

export function middleware(request: NextRequest) {
    // 1-1. 역방향 프록시(NGINX) 환경에서 호스트 및 프로토콜 정보 강제 추출
    // PC 등에서 Host가 잘려서 404가 발생하는 것을 방지하는 무적 방어막
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    // x-forwarded 헤더가 없으면 원래 호스트 사용
    const host = forwardedHost || request.headers.get('host') || '';

    // 🔥 [핵심 방어막] 호스트 주소에 도메인(synology.me)이 들어있다면 무조건 https 강제 고정!
    // 이렇게 하면 새 기기가 쿠키 없이 붙어도 http:// 로 쫓겨나서 벽에 부딪히는 불상사가 사라집니다.
    let protocol = forwardedProto || 'http';
    if (host.includes('synology.me')) {
        protocol = 'https';
    }

    const baseUrl = `${protocol}://${host}`;

    const url = request.nextUrl.clone();

    // 2. URL 쿼리 파라미터에서 qrexh 확인
    const qrAuthParam = url.searchParams.get('qrexh');
    const authCookieName = 'auth-session';

    // 3. 올바른 QR 파라미터로 접속한 경우
    if (qrAuthParam === '2026seoul') {
        // 기준 URL(Base URL)과 루트 경로 '/'를 합성하여 어떠한 환경에서도 강제로 메인 이동!
        const redirectUrl = new URL('/', baseUrl);
        const response = NextResponse.redirect(redirectUrl);

        // 30분(1800초)짜리 쿠키 발급
        response.cookies.set({
            name: authCookieName,
            value: 'true',
            path: '/',
            maxAge: 1800, // 30분으로 연장
            httpOnly: true,
            secure: protocol === 'https', // 나스 환경 역방향 프록시(HTTPS/HTTP) 상태에 동적 대응
            sameSite: 'lax',
        });

        return response;
    }

    // 4. 파라미터가 없으면 쿠키 확인
    const hasAuthCookie = request.cookies.has(authCookieName);

    // 5. 권한 증명 실패 시 /unauthorized로 리다이렉트
    if (!hasAuthCookie) {
        // 절대 경로(baseUrl + '/unauthorized') 조합으로 PC 웹 404 원천 차단
        const unauthorizedUrl = new URL('/unauthorized', baseUrl);
        return NextResponse.redirect(unauthorizedUrl);
    }

    // 쿠키가 존재하면 정상 흐름 진행
    return NextResponse.next();
}
