export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { encrypt, decrypt } from '../../../../lib/crypto';

// 어드민 설정 가져오기
export async function GET() {
    try {
        const stmt = db.prepare('SELECT * FROM settings WHERE id = ?');
        const settings = stmt.get('default') as any;

        if (!settings) {
            return NextResponse.json({ active_model: 'gemini', gemini_key: '', flux_key: '' });
        }

        return NextResponse.json({
            active_model: settings.active_model,
            active_font: settings.active_font || 'notoSansKr',
            // 클라이언트로 보낼 땐 키가 있는지 여부만 알 수 있도록 마스킹 처리 (보안)
            has_gemini_key: !!settings.gemini_key,
            has_flux_key: !!settings.flux_key,
        });
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// 어드민 설정 업데이트 (비밀번호 확인 포함)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { active_model, active_font, gemini_key, flux_key, admin_password } = body;

        // 아주 단순한 로그인 검증 (하드코딩 - 실제론 환경변수나 DB 사용 권장)
        if (admin_password !== '7575admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stmt = db.prepare('SELECT * FROM settings WHERE id = ?');
        const currentSettings = stmt.get('default') as any;

        const newGeminiKey = gemini_key ? encrypt(gemini_key) : currentSettings?.gemini_key;
        const newFluxKey = flux_key ? encrypt(flux_key) : currentSettings?.flux_key;

        const updateStmt = db.prepare(`
            UPDATE settings 
            SET active_model = ?, active_font = ?, gemini_key = ?, flux_key = ?
            WHERE id = 'default'
        `);
        updateStmt.run(active_model || 'gemini', active_font || 'notoSansKr', newGeminiKey, newFluxKey);

        return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error("Failed to update settings:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
