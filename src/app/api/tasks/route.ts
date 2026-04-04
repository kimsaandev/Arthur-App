import { NextRequest, NextResponse } from 'next/server';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const getAll = searchParams.get('all') === 'true';

        // Pagination params (default: page 1, limit 12)
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = 12;
        const offset = (page - 1) * limit;

        let tasks;
        let totalCount = 0;

        if (getAll) {
            // 갤러리용: 전체 갯수 파악
            const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks');
            const countResult = countStmt.get() as { count: number };
            totalCount = countResult.count;

            // 해당 페이지 데이터만 최신순으로 반환
            const stmt = db.prepare('SELECT * FROM tasks ORDER BY timestamp DESC LIMIT ? OFFSET ?');
            tasks = stmt.all(limit, offset);
        } else {
            // 미완료 항목 중 생성된 지 10분(600,000ms)이 지난 항목은 강제로 완료 처리 (오래된 대기열 정리)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const expireStmt = db.prepare('UPDATE tasks SET completed = 1 WHERE completed = 0 AND timestamp < ?');
            expireStmt.run(tenMinutesAgo);

            // 키오스크용: 미완료 내역만 반환 (전체 반환)
            const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed = 0');
            const countResult = countStmt.get() as { count: number };
            totalCount = countResult.count;

            const stmt = db.prepare('SELECT * FROM tasks WHERE completed = 0 ORDER BY timestamp ASC');
            tasks = stmt.all();
        }

        // SQLite의 숫자형 boolean(0,1)을 JS boolean(false,true)으로 매핑
        tasks = tasks.map((t: any) => ({
            ...t,
            completed: t.completed === 1
        }));

        return NextResponse.json({
            tasks,
            pagination: {
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { id } = await req.json();

        const stmt = db.prepare('UPDATE tasks SET completed = 1 WHERE id = ?');
        stmt.run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { ids, password } = await req.json();

        // 보안 패치: 하드코딩된 삭제 비밀번호 서버사이드 검증
        if (password !== '7575') {
            return NextResponse.json({ error: 'Unauthorized: 비밀번호가 틀렸습니다.' }, { status: 401 });
        }

        const idsToDelete = Array.isArray(ids) ? ids : [ids];

        if (idsToDelete.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        const placeholders = idsToDelete.map(() => '?').join(',');

        // 1. 디스크에서 삭제할 이미지 경로를 먼저 가져옴
        const selectStmt = db.prepare(`SELECT image, instaImage FROM tasks WHERE id IN (${placeholders})`);
        const tasksToDelete = selectStmt.all(...idsToDelete);

        // 2. 물리적 이미지 파일 삭제
        tasksToDelete.forEach((t: any) => {
            if (t.image && t.image.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), 'public', t.image);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            if (t.instaImage && t.instaImage.startsWith('/uploads/')) {
                const instaFilePath = path.join(process.cwd(), 'public', t.instaImage);
                if (fs.existsSync(instaFilePath)) {
                    fs.unlinkSync(instaFilePath);
                }
            }
        });

        // 3. DB 로우 삭제
        const deleteStmt = db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`);
        deleteStmt.run(...idsToDelete);

        return NextResponse.json({ success: true, count: idsToDelete.length });
    } catch (error) {
        console.error('Error deleting tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
