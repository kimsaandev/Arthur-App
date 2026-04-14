export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        let filename = url.pathname.replace('/api/uploads/', '');
        filename = decodeURIComponent(filename);

        if (!filename) {
            return new NextResponse('Bad Request', { status: 400 });
        }

        const safeFilename = path.basename(filename);
        const r2PublicUrl = process.env.R2_PUBLIC_URL;

        if (!r2PublicUrl) {
            return new NextResponse('Storage not configured', { status: 500 });
        }

        // R2 퍼블릭 URL로 리다이렉트
        return NextResponse.redirect(`${r2PublicUrl}/${safeFilename}`, { status: 302 });

    } catch (e) {
        console.error('Error serving file:', e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
