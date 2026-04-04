
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

async function testNano() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "nano-banana-pro-preview" });
        const result = await model.generateContent("hello");
        console.log("Success with nano-banana-pro-preview");
        console.log(result.response.text());
    } catch (e) {
        console.error("FAIL nano-banana-pro-preview:", e.message);
    }
}

testNano();
