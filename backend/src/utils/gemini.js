const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured.");
}

if (!geminiModel) {
  throw new Error("GEMINI_MODEL is not configured.");
}

const geminiClient = new GoogleGenAI({
  apiKey
});

module.exports = {
  geminiClient,
  geminiModel
};


// const { GoogleGenAI } = require("@google/genai");

// const apiKey = process.env.GEMINI_API_KEY;
// const geminiModel = process.env.GEMINI_MODEL;

// if (!apiKey) {
//   throw new Error("GEMINI_API_KEY is not configured.");
// }

// if (!geminiModel) {
//   throw new Error("GEMINI_MODEL is not configured.");
// }

// const geminiClient = new GoogleGenAI({
//   apiKey
// });

// module.exports = {
//   geminiClient,
//   geminiModel
// };