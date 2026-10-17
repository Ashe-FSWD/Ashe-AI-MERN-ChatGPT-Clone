import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

export const geminiClient = new GoogleGenAI({ apiKey });
export { geminiModel };
