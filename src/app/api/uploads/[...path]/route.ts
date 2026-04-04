import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);

        // 경로에서 '/api/uploads/' 이후의 부분을 파일명으로 추출
        let filename = url.pathname.replace('/api/uploads/', '');

        // 쿼리 파라미터 등이 붙어있다면 순수 파일명만 남기기 위해 안전 장치 추가
        filename = decodeURIComponent(filename);

        if (!filename) {
            return new NextResponse('Bad Request', { status: 400 });
        }

        // 보안: 디렉토리 순회(Directory Traversal) 방어 (path.basename을 통해 폴더 이동 문자열 원천 차단)
        const safeFilename = path.basename(filename);
        const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);

        let contentType = 'image/jpeg';
        if (safeFilename.toLowerCase().endsWith('.png')) contentType = 'image/png';
        else if (safeFilename.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
        else if (safeFilename.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                // 항상 최신 파일을 불러오도록 캐시 제한 (또는 public 적용 시 브라우저 갱신)
                'Cache-Control': 'public, max-age=3600, must-revalidate',
            },
        });
    } catch (e) {
        console.error('Error serving file:', e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
