
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Current SDK method for listing models
        const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels ? await genAI.listModels() : { models: [] };
        // If listModels is not on genAI directly, we might need to use the REST API via fetch
        // But @google/generative-ai version 0.24.1 should have some way.
        // Actually, the most reliable way to check a model name is to try it.
        console.log("Checking specific target models...");
        const targets = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-2.0-flash"];
        for (const m of targets) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("test");
                console.log(`[SUCCESS] ${m} is available`);
            } catch (e) {
                console.log(`[FAIL] ${m}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
