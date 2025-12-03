/**
 * Gemini Config - Cấu hình và khởi tạo Gemini API
 */
import { GoogleGenAI } from "@google/genai";
import { debugLog } from "../../core/logger/logger.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

debugLog("GEMINI", "Initializing Gemini API...");

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const GEMINI_MODEL = "models/gemini-flash-latest";

export const GEMINI_CONFIG = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 65536,
  thinkingConfig: {
    thinkingBudget: 8192,
  },
  tools: [{ googleSearch: {} }, { urlContext: {} }],
};

// Regex để detect YouTube URL
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

export function extractYouTubeUrls(text: string): string[] {
  return [...text.matchAll(YOUTUBE_REGEX)].map(
    (m) => `https://www.youtube.com/watch?v=${m[1]}`
  );
}

// Media types
export type MediaType = "image" | "video" | "audio" | "file" | "youtube";

export interface MediaPart {
  type: MediaType;
  url?: string;
  mimeType?: string;
  base64?: string;
}
