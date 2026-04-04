
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

async function listModels() {
    // Use v1 instead of beta if possible, but SDK manages this.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Correct way to call listModels in newer SDK versions:
        // It's a method on the genAI instance.
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
        // Wait, listModels is actually a top-level method sometimes or on the genAI instance.
        // Let's try the direct fetch to the discovery API.
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

listModels();
