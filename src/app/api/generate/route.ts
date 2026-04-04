import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import FilterKo from 'badwords-ko';
import FilterEn from 'bad-words';
import db from '../../../lib/db';
import { decrypt } from '../../../lib/crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;
// 간단한 인라인 로깅 함수 (외부 스크립트 참조 제거)
const log = (message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
};

// Helper to get formatted timestamp
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

// Helper to save image, create Insta composite, and update DB
async function processAndSaveImage(generatedBase64: string, userName: string, isFallback: boolean = false) {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestampStr = getFormattedTimestamp();
    const cleanUserName = (userName || 'friend').replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/gi, '_');

    // Normal file name: YYYYMMDD_HHMMSS_userName.jpg
    const fileName = `${timestampStr}_${cleanUserName}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    const base64DataOnly = generatedBase64.split(',')[1];
    const imageBuffer = Buffer.from(base64DataOnly, 'base64');
    fs.writeFileSync(filePath, imageBuffer);

    // Insta Composite file name: YYYYMMDD_HHMMSS_insta_userName.jpg
    const instaFileName = `${timestampStr}_insta_${cleanUserName}.jpg`;
    const instaFilePath = path.join(uploadDir, instaFileName);
    const instaBgPath = path.join(process.cwd(), 'public', 'Insta_BGJPG.JPG');

    let instaImageUrl = undefined;
    if (fs.existsSync(instaBgPath)) {
        try {
            const resizedBuffer = await sharp(imageBuffer)
                .resize({ width: 1080, height: 806, fit: 'fill' })
                .toBuffer();

            await sharp(instaBgPath)
                .composite([{ input: resizedBuffer, top: 390, left: 0 }])
                .toFile(instaFilePath);

            instaImageUrl = `/uploads/${instaFileName}`;
        } catch (e) {
            console.error("Insta Composition Error:", e);
            instaImageUrl = undefined; // Fallback if error
        }
    }

    const imageUrl = `/uploads/${fileName}`;
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
    // SQLite에서는 성능 문제가 없어 더이상 50개 제한을 두지 않고 전체 기록을 보존합니다.
}

// Simulated Gemini Image Generation Logic
export async function POST(req: NextRequest) {
    try {
        const { userImage, userName } = await req.json();

        if (!userImage) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // [보안 패치] 대용량(약 10MB 이상) Base64 데이터의 무단 전송을 통한 메세지/메모리 고갈 방지
        // 약 14,000,000 자 이상이면 차단
        if (userImage.length > 15000000) {
            console.error("Payload too large: image string length is over limit");
            return NextResponse.json({
                success: false,
                message: "업로드한 사진의 용량이 너무 큽니다. 더 가벼운 사진으로 시도해 주세요!"
            });
        }

        // 1. Load the Base Arthur Image
        const baseImagePath = path.join(process.cwd(), 'public', 'arthur_template.jpg');
        let baseImageBase64 = '';
        if (fs.existsSync(baseImagePath)) {
            const baseImageBuffer = fs.readFileSync(baseImagePath);
            baseImageBase64 = baseImageBuffer.toString('base64');
        } else {
            return NextResponse.json({
                error: 'Base image not found.',
                hint: 'Please ensure public/arthur_template.jpg exists.'
            }, { status: 404 });
        }

        // 2. Setup Gemini or Flux from DB Settings
        const stmt = db.prepare('SELECT * FROM settings WHERE id = ?');
        const settings = stmt.get('default') as any;

        const activeModel = settings?.active_model || 'gemini';
        let geminiApiKey = settings?.gemini_key ? decrypt(settings.gemini_key) : process.env.GEMINI_API_KEY;
        let fluxApiKey = settings?.flux_key ? decrypt(settings.flux_key) : '';

        // --- Step A: AI Safety Check for Username ---
        const filterKo = new FilterKo();
        const filterEn = new FilterEn();
        if (filterKo.isProfane(userName || 'friend') || filterEn.isProfane(userName || 'friend')) {
            log(`Safety catch: name "${userName}" was blocked.`);
            return NextResponse.json({
                success: false,
                message: "부적절한 이름이 감지되었습니다. 파티에 어울리는 예쁜 이름을 입력해 주세요!"
            });
        }
        // --- End Safety Check ---

        console.log(`--- Processing Request [Model: ${activeModel}] ---`);

        // ==========================================
        // FLUX.2 BRANCH (Black Forest Labs)
        // ==========================================
        if (activeModel === 'flux') {
            if (!fluxApiKey) throw new Error("Flux API 키가 설정되지 않았습니다. 어드민 페이지에서 키를 입력하세요.");
            console.log("Using Flux.2 API (BFL)");

            // BFL API 요구사항: 이미지 base64만 전송 (헤더 접두사 제거)
            const bflBase64 = baseImageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
            const userBase64 = userImage.replace(/^data:image\/[a-z]+;base64,/, "");

            // BFL Multi-Reference 최적화 프롬프트
            const fluxPrompt = `Using image 1 as the base watercolor illustration, replace the character in the center with the person's face and clothing from image 2. 
            Maintain the exact same watercolor art style and aesthetic of image 1.
            Change the text on the banner to "HAPPY BIRTHDAY ${userName || 'FRIEND'}". 
            Keep all other background elements, characters, and the 4:3 aspect ratio of image 1 unchanged.`;

            // BFL Image-to-Image 요청 (Multi-Reference support)
            const response = await fetch("https://api.bfl.ai/v1/flux-2-klein-9b", {
                method: "POST",
                headers: {
                    "X-Key": fluxApiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input_image: bflBase64,       // Image 1
                    input_image_2: userBase64,     // Image 2
                    prompt: fluxPrompt,
                    prompt_upsampling: false,
                    seed: 806370,
                    guidance: 30,
                    output_format: "jpeg"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`BFL API Request Failed [${response.status}]: ${errorText}`);
            }
            const resultData = await response.json();
            const taskId = resultData.id;

            console.log("Flux Task ID Created:", taskId);

            // BFL Polling Logic
            let predictionStatus = "Pending";
            let finalImageUrl = "";

            while (
                predictionStatus !== "Ready" &&
                predictionStatus !== "Failed"
            ) {
                await new Promise((r) => setTimeout(r, 1500)); // 1.5초마다 폴링

                // 폴링 주소도 .ai 로 통일
                const pollRes = await fetch(
                    `https://api.bfl.ai/v1/get_result?id=${taskId}`,
                    { headers: { "X-Key": fluxApiKey } }
                );
                const pollData = await pollRes.json();

                predictionStatus = pollData.status;

                if (predictionStatus === "Ready") {
                    finalImageUrl = pollData.result.sample;
                }
            }

            if (predictionStatus === "Failed") {
                throw new Error("Flux Image generation failed.");
            }

            // Fetch the resulting image URL and convert to Base64
            const imgRes = await fetch(finalImageUrl);
            const imgBuffer = await imgRes.arrayBuffer();
            const generatedImageB64 = `data:image/jpeg;base64,${Buffer.from(imgBuffer).toString('base64')}`;

            const { imageUrl, instaImageUrl } = await processAndSaveImage(generatedImageB64, userName);
            await saveToDb(imageUrl, instaImageUrl);

            return NextResponse.json({
                success: true,
                image: imageUrl,
                instaImage: instaImageUrl,
                message: "Flux.2 모델을 사용하여 생성을 완료했습니다!"
            });
        }

        // ==========================================
        // GEMINI BRANCH (Default)
        // ==========================================
        if (activeModel === 'gemini' && geminiApiKey && geminiApiKey.startsWith('AIza')) {
            console.log("Using Real Gemini API Key");
            try {
                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const geminiImageModel =
                    process.env.GEMINI_IMAGE_MODEL ||
                    'gemini-3.1-flash-image-preview';

                const model = genAI.getGenerativeModel({
                    model: geminiImageModel,
                });

                // Prepare parts
                const base64Data = baseImageBase64;
                const userData = userImage.split(',')[1];

                const imageParts = [
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
                    { inlineData: { data: userData, mimeType: "image/jpeg" } },
                ];

                const prompt = `
                  IMAGE 1 (TEMPLATE): arthur_template.jpg
                  IMAGE 2 (FACE): User photo
                  
                  TASK: Create a result image based on IMAGE 1. 
                  Using arthur_template.jpg as the base illustration, replace Arthur in the center with the person from IMAGE 2 rendering them in the exact same watercolor art style.
                  Change the banner text to "HAPPY BIRTHDAY ${userName || 'FRIEND'}".
                  Keep all other characters, the background, and the overall composition of IMAGE 1 unchanged. Aspect ratio 4:3
                `;

                const result = await model.generateContent([prompt, ...imageParts]);
                const response = await result.response;

                let generatedImageB64 = null;
                const candidate = response.candidates?.[0];
                if (candidate?.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                            generatedImageB64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            break;
                        }
                    }
                }

                // fallback to user image if generation failed
                const finalImageB64 = generatedImageB64 || userImage;

                const { imageUrl, instaImageUrl } = await processAndSaveImage(finalImageB64, userName);
                await saveToDb(imageUrl, instaImageUrl);

                const displayMessage = generatedImageB64
                    ? "얼굴 합성 작업이 성공적으로 완료되었습니다!"
                    : "이미지를 생성하지 못했습니다. 원본 사진을 파일로 저장했습니다.";

                return NextResponse.json({
                    success: true,
                    image: imageUrl,
                    instaImage: instaImageUrl,
                    message: displayMessage
                });

            } catch (apiError: any) {
                console.error("Gemini API Error details:", apiError);
                try {
                    // Even on error, save the user's upload as a file
                    const { imageUrl, instaImageUrl } = await processAndSaveImage(userImage, userName, true);
                    await saveToDb(imageUrl, instaImageUrl);

                    return NextResponse.json({
                        success: false,
                        image: imageUrl,
                        instaImage: instaImageUrl,
                        message: `API 오류: ${apiError.message || "Gemini에 연결하지 못했습니다."}. 업로드한 사진을 대신 보여줍니다.`
                    });
                } catch (dbErr) { console.error("DB error", dbErr); }

                return NextResponse.json({
                    success: false,
                    image: userImage,
                    message: `API 오류: ${apiError.message || "Gemini에 연결하지 못했습니다."}.`
                });
            }
        }

        // Fallback Simulation (No Key or Invalid Key)
        console.log("Using Simulation Mode (No Key)");
        const { imageUrl, instaImageUrl } = await processAndSaveImage(userImage, userName);
        await saveToDb(imageUrl, instaImageUrl);

        await new Promise(resolve => setTimeout(resolve, 1500));

        return NextResponse.json({
            success: true,
            image: imageUrl,
            instaImage: instaImageUrl,
            message: "시뮬레이션 모드: 사진을 파일로 저장했습니다. (얼굴 합성을 위해서는 실제 API 키가 필요합니다)"
        });

    } catch (error: any) {
        console.error('Error generating image:', error);
        return NextResponse.json({
            success: false,
            message: `에러가 발생했습니다: ${error.message || '알 수 없는 서버 오류'}`
        }, { status: 200 });
    }
}
