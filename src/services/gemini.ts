import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../config/index.js";
import {
  AIResponse,
  DEFAULT_RESPONSE,
  parseAIResponse,
} from "../config/schema.js";
import { fetchAsBase64 } from "../utils/fetch.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============ GEMINI CONFIG - CHỈ CHỈNH Ở ĐÂY ============
const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_CONFIG = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 65536,
  thinkingConfig: {
    thinkingBudget: 8192, // High thinking level
  },
  // Tools
  tools: [
    { googleSearch: {} }, // Grounding with Google Search
    { urlContext: {} }, // Đọc nội dung URL
  ],
};
// ========================================================

// Re-export parseAIResponse từ schema
export { parseAIResponse } from "../config/schema.js";

// Regex để detect YouTube URL
const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

/**
 * Kiểm tra và chuẩn hóa YouTube URL
 */
export function extractYouTubeUrls(text: string): string[] {
  const matches = text.matchAll(YOUTUBE_REGEX);
  const urls: string[] = [];
  for (const match of matches) {
    urls.push(`https://www.youtube.com/watch?v=${match[1]}`);
  }
  return urls;
}

/**
 * Kiểm tra có phải YouTube URL không
 */
export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

// Lưu chat sessions cho multi-turn conversation
const chatSessions = new Map<string, any>();

/**
 * Tạo hoặc lấy chat session cho một thread
 */
export function getChatSession(threadId: string, history: any[] = []) {
  if (!chatSessions.has(threadId)) {
    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...GEMINI_CONFIG,
      },
      history: history.length > 0 ? history : undefined,
    });
    chatSessions.set(threadId, chat);
  }
  return chatSessions.get(threadId);
}

/**
 * Xóa chat session
 */
export function clearChatSession(threadId: string) {
  chatSessions.delete(threadId);
}

/**
 * Gửi tin nhắn text và nhận phản hồi (multi-turn)
 */
export async function sendMessage(
  threadId: string,
  message: string
): Promise<string> {
  try {
    const chat = getChatSession(threadId);
    const response = await chat.sendMessage({ message });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

/**
 * Generate content với hình ảnh (multimodal)
 */
export async function generateWithImage(
  prompt: string,
  imageUrl: string
): Promise<AIResponse> {
  try {
    const base64Image = await fetchAsBase64(imageUrl);
    if (!base64Image) {
      return {
        reaction: "sad",
        messages: [
          { text: "Không tải được hình ảnh.", sticker: "", quoteIndex: -1 },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Image, mimeType: "image/png" } },
      ],
      config: GEMINI_CONFIG,
    });

    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với audio (voice message)
 */
export async function generateWithAudio(
  prompt: string,
  audioUrl: string,
  mimeType: string = "audio/aac"
): Promise<AIResponse> {
  try {
    const base64Audio = await fetchAsBase64(audioUrl);
    if (!base64Audio) {
      return {
        reaction: "sad",
        messages: [
          { text: "Không tải được audio.", sticker: "", quoteIndex: -1 },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Audio, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với file (PDF, DOC, etc.)
 */
export async function generateWithFile(
  prompt: string,
  fileUrl: string,
  mimeType: string
): Promise<AIResponse> {
  try {
    const base64File = await fetchAsBase64(fileUrl);
    if (!base64File) {
      return {
        reaction: "sad",
        messages: [
          { text: "Không tải được file.", sticker: "", quoteIndex: -1 },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64File, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini File Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content đơn giản (không có media) - có Google Search + URL Context
 */
export async function generateContent(prompt: string): Promise<AIResponse> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      config: GEMINI_CONFIG,
    });
    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với base64 data trực tiếp (không cần fetch URL)
 * Dùng cho file đã convert sang .txt
 */
export async function generateWithBase64(
  prompt: string,
  base64Data: string,
  mimeType: string
): Promise<AIResponse> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Data, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });
    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Base64 Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với video (base64, dưới 20MB)
 */
export async function generateWithVideo(
  prompt: string,
  videoUrl: string,
  mimeType: string = "video/mp4"
): Promise<AIResponse> {
  try {
    console.log(`[Gemini] 🎬 Xử lý video: ${videoUrl}`);
    const base64Video = await fetchAsBase64(videoUrl);
    if (!base64Video) {
      return {
        reaction: "sad",
        messages: [
          { text: "Không tải được video.", sticker: "", quoteIndex: -1 },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Video, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Video Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với YouTube video
 */
export async function generateWithYouTube(
  prompt: string,
  youtubeUrl: string
): Promise<AIResponse> {
  try {
    console.log(`[Gemini] 🎬 Xử lý YouTube: ${youtubeUrl}`);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { fileData: { fileUri: youtubeUrl } },
      ],
      config: GEMINI_CONFIG,
    });
    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini YouTube Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với nhiều YouTube videos
 */
export async function generateWithMultipleYouTube(
  prompt: string,
  youtubeUrls: string[]
): Promise<AIResponse> {
  try {
    console.log(`[Gemini] 🎬 Xử lý ${youtubeUrls.length} YouTube videos`);
    const contents: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }];
    for (const url of youtubeUrls.slice(0, 10)) {
      // Max 10 videos
      contents.push({ fileData: { fileUri: url } });
    }
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: GEMINI_CONFIG,
    });
    return parseAIResponse(response.text || "{}");
  } catch (error) {
    console.error("Gemini YouTube Error:", error);
    return DEFAULT_RESPONSE;
  }
}

// Legacy export for backward compatibility
export const getGeminiReply = generateContent;
