export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import FilterKo from 'badwords-ko';
import FilterEn from 'bad-words';
import db from '../../../lib/db';
import { decrypt } from '../../../lib/crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 베이스 이미지 메모리 캐시 (서버 시작 시 1회 로드)
let cachedBaseImageBase64: string | null = null;
function getBaseImage(): string {
    if (!cachedBaseImageBase64) {
        const baseImagePath = path.join(process.cwd(), 'public', 'arthur_template.jpg');
        cachedBaseImageBase64 = fs.readFileSync(baseImagePath).toString('base64');
        console.log('[Cache] Base image loaded into memory');
    }
    return cachedBaseImageBase64;
}

// R2 S3 클라이언트 초기화
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// R2에 이미지 업로드 후 공개 URL 반환
async function uploadToR2(buffer: Buffer, filename: string, contentType = 'image/jpeg'): Promise<string> {
    await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
    }));
    return `${R2_PUBLIC_URL}/${filename}`;
}

const log = (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function processAndSaveImage(generatedBase64: string, userName: string, isFallback: boolean = false) {
    const timestampStr = getFormattedTimestamp();
    const cleanUserName = (userName || 'friend').replace(/[^a-z0-9\u3131-\u314E\u314F-\u3163\uAC00-\uD7A3]/gi, '_');

    const fileName = `${timestampStr}_${cleanUserName}.jpg`;
    const base64DataOnly = generatedBase64.split(',')[1];
    const imageBuffer = Buffer.from(base64DataOnly, 'base64');

    // R2에 원본 업로드
    const imageUrl = await uploadToR2(imageBuffer, fileName);

    // Insta 합성
    let instaImageUrl: string | undefined = undefined;
    const instaBgPath = path.join(process.cwd(), 'public', 'Insta_BGJPG.JPG');

    if (fs.existsSync(instaBgPath)) {
        try {
            const resizedBuffer = await sharp(imageBuffer)
                .resize({ width: 1080, height: 806, fit: 'fill' })
                .toBuffer();

            const instaBuffer = await sharp(instaBgPath)
                .composite([{ input: resizedBuffer, top: 390, left: 0 }])
                .jpeg()
                .toBuffer();

            const instaFileName = `${timestampStr}_insta_${cleanUserName}.jpg`;
            instaImageUrl = await uploadToR2(instaBuffer, instaFileName);
        } catch (e) {
            console.error('Insta Composition Error:', e);
        }
    }

    return { imageUrl, instaImageUrl };
}

async function saveToDb(imageUrl: string, instaImageUrl: string | undefined) {
    const id = Date.now().toString();
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT INTO tasks (id, image, instaImage, completed, timestamp)
        VALUES (?, ?, ?, 0, ?)
    `);
    stmt.run(id, imageUrl, instaImageUrl || null, timestamp);
}

export async function POST(req: NextRequest) {
    try {
        const { userImage, userName } = await req.json();

        if (!userImage) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (userImage.length > 15000000) {
            return NextResponse.json({
                success: false,
                message: '업로드한 사진의 용량이 너무 큽니다. 더 가벼운 사진으로 시도해 주세요!'
            });
        }

        // 메모리 캐시에서 베이스 이미지 로드
        let baseImageBase64 = '';
        try {
            baseImageBase64 = getBaseImage();
        } catch (e) {
            return NextResponse.json({ error: 'Base image not found.' }, { status: 404 });
        }

        // 사용자 이미지 리사이즈 (API 전송 최적화: 1024px, quality 85)
        let optimizedUserImage = userImage;
        try {
            const userBuffer = Buffer.from(userImage.split(',')[1], 'base64');
            const resizedBuffer = await sharp(userBuffer)
                .resize({ width: 1024, withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            optimizedUserImage = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
        } catch (e) {
            console.error('Image resize failed, using original:', e);
        }

        const stmt = db.prepare('SELECT * FROM settings WHERE id = ?');
        const settings = stmt.get('default') as any;
        const activeModel = settings?.active_model || 'gemini';
        let geminiApiKey = settings?.gemini_key ? decrypt(settings.gemini_key) : process.env.GEMINI_API_KEY;
        let fluxApiKey = settings?.flux_key ? decrypt(settings.flux_key) : '';

        const filterKo = new FilterKo();
        const filterEn = new FilterEn();
        if (filterKo.isProfane(userName || 'friend') || filterEn.isProfane(userName || 'friend')) {
            return NextResponse.json({
                success: false,
                message: '부적절한 이름이 감지되었습니다. 파티에 어울리는 예쁜 이름을 입력해 주세요!'
            });
        }

        console.log(`--- Processing Request [Model: ${activeModel}] ---`);

        // FLUX BRANCH
        if (activeModel === 'flux') {
            if (!fluxApiKey) throw new Error('Flux API 키가 설정되지 않았습니다.');

            const bflBase64 = baseImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const userBase64 = optimizedUserImage.replace(/^data:image\/[a-z]+;base64,/, '');
            const fluxPrompt = `Using image 1 as the base watercolor illustration, replace the character in the center with the person's face and clothing from image 2. Maintain the exact same watercolor art style. Change the text on the banner to "HAPPY BIRTHDAY ${userName || 'FRIEND'}". Keep all other background elements unchanged.`;

            const response = await fetch('https://api.bfl.ai/v1/flux-2-klein-9b', {
                method: 'POST',
                headers: { 'X-Key': fluxApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_image: bflBase64,
                    input_image_2: userBase64,
                    prompt: fluxPrompt,
                    prompt_upsampling: false,
                    seed: 806370,
                    guidance: 30,
                    output_format: 'jpeg'
                })
            });

            if (!response.ok) throw new Error(`BFL API Failed [${response.status}]`);
            const { id: taskId } = await response.json();

            let predictionStatus = 'Pending';
            let finalImageUrl = '';
            while (predictionStatus !== 'Ready' && predictionStatus !== 'Failed') {
                await new Promise(r => setTimeout(r, 1500));
                const pollData = await (await fetch(`https://api.bfl.ai/v1/get_result?id=${taskId}`, { headers: { 'X-Key': fluxApiKey } })).json();
                predictionStatus = pollData.status;
                if (predictionStatus === 'Ready') finalImageUrl = pollData.result.sample;
            }

            if (predictionStatus === 'Failed') throw new Error('Flux generation failed.');

            const imgBuffer = Buffer.from(await (await fetch(finalImageUrl)).arrayBuffer());
            const generatedImageB64 = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
            const { imageUrl, instaImageUrl } = await processAndSaveImage(generatedImageB64, userName);
            await saveToDb(imageUrl, instaImageUrl);

            return NextResponse.json({ success: true, image: imageUrl, instaImage: instaImageUrl, message: 'Flux.2 모델로 생성 완료!' });
        }

        // GEMINI BRANCH
        if (activeModel === 'gemini' && geminiApiKey && geminiApiKey.startsWith('AIza')) {
            try {
                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const model = genAI.getGenerativeModel({ model: 'nano-banana-pro-preview' });
                const imageParts = [
                    { inlineData: { data: baseImageBase64, mimeType: 'image/jpeg' } },
                    { inlineData: { data: optimizedUserImage.split(',')[1], mimeType: 'image/jpeg' } },
                ];
                const prompt = `IMAGE 1 (TEMPLATE): arthur_template.jpg\nIMAGE 2 (FACE): User photo\nTASK: Replace Arthur with the person from IMAGE 2 in watercolor style. Change banner to "HAPPY BIRTHDAY ${userName || 'FRIEND'}". Keep all other elements. Aspect ratio 4:3`;

                const result = await model.generateContent([prompt, ...imageParts]);
                const candidate = result.response.candidates?.[0];
                let generatedImageB64 = null;
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData?.mimeType.startsWith('image/')) {
                            generatedImageB64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            break;
                        }
                    }
                }

                const finalImageB64 = generatedImageB64 || userImage;
                const { imageUrl, instaImageUrl } = await processAndSaveImage(finalImageB64, userName);
                await saveToDb(imageUrl, instaImageUrl);

                return NextResponse.json({
                    success: true,
                    image: imageUrl,
                    instaImage: instaImageUrl,
                    message: generatedImageB64 ? '얼굴 합성 완료!' : '이미지 저장 완료 (합성 실패)'
                });
            } catch (apiError: any) {
                try {
                    const { imageUrl, instaImageUrl } = await processAndSaveImage(optimizedUserImage, userName, true);
                    await saveToDb(imageUrl, instaImageUrl);
                    return NextResponse.json({ success: false, image: imageUrl, instaImage: instaImageUrl, message: `API 오류: ${apiError.message}` });
                } catch (e) { console.error('DB error', e); }
                return NextResponse.json({ success: false, image: userImage, message: `API 오류: ${apiError.message}` });
            }
        }

        // SIMULATION
        const { imageUrl, instaImageUrl } = await processAndSaveImage(optimizedUserImage, userName);
        await saveToDb(imageUrl, instaImageUrl);
        await new Promise(resolve => setTimeout(resolve, 1500));

        return NextResponse.json({
            success: true,
            image: imageUrl,
            instaImage: instaImageUrl,
            message: '시뮬레이션 모드: 사진 저장 완료'
        });

    } catch (error: any) {
        console.error('Error generating image:', error);
        return NextResponse.json({ success: false, message: `에러: ${error.message || '알 수 없는 오류'}` }, { status: 200 });
    }
}