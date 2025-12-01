import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../config/index.js";
import { fetchAsBase64 } from "../utils/fetch.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Config chung cho Gemini - theo settings trong hình
const GENERATION_CONFIG = {
  temperature: 1,
  topP: 0.95,
  maxOutputTokens: 65536,
  thinkingConfig: {
    thinkingBudget: 8192, // High thinking level
  },
};

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
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...GENERATION_CONFIG,
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
): Promise<string> {
  try {
    const base64Image = await fetchAsBase64(imageUrl);
    if (!base64Image) {
      return "Không tải được hình ảnh.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Image, mimeType: "image/png" } },
      ],
      config: GENERATION_CONFIG,
    });

    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return "Lỗi xử lý hình ảnh, thử lại sau nhé!";
  }
}

/**
 * Generate content với audio (voice message)
 */
export async function generateWithAudio(
  prompt: string,
  audioUrl: string,
  mimeType: string = "audio/aac"
): Promise<string> {
  try {
    const base64Audio = await fetchAsBase64(audioUrl);
    if (!base64Audio) {
      return "Không tải được audio.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Audio, mimeType } },
      ],
      config: GENERATION_CONFIG,
    });

    return response.text || "Không nghe rõ, bạn nói lại được không?";
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    return "Lỗi xử lý audio, thử lại sau nhé!";
  }
}

/**
 * Generate content với file (PDF, DOC, etc.)
 */
export async function generateWithFile(
  prompt: string,
  fileUrl: string,
  mimeType: string
): Promise<string> {
  try {
    const base64File = await fetchAsBase64(fileUrl);
    if (!base64File) {
      return "Không tải được file.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64File, mimeType } },
      ],
      config: GENERATION_CONFIG,
    });

    return response.text || "Không đọc được file này.";
  } catch (error) {
    console.error("Gemini File Error:", error);
    return "Lỗi xử lý file, thử lại sau nhé!";
  }
}

/**
 * Generate content đơn giản (không có media)
 */
export async function generateContent(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      config: GENERATION_CONFIG,
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

/**
 * Generate content với YouTube video
 */
export async function generateWithYouTube(
  prompt: string,
  youtubeUrl: string
): Promise<string> {
  try {
    console.log(`[Gemini] 🎬 Xử lý YouTube: ${youtubeUrl}`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { fileData: { fileUri: youtubeUrl } },
      ],
      config: GENERATION_CONFIG,
    });
    return response.text || "Không xem được video này.";
  } catch (error) {
    console.error("Gemini YouTube Error:", error);
    return "Lỗi xử lý video YouTube, thử lại sau nhé!";
  }
}

/**
 * Generate content với URL context (đọc nội dung trang web)
 */
export async function generateWithUrl(
  prompt: string,
  urls: string[]
): Promise<string> {
  try {
    console.log(`[Gemini] 🔗 Đọc URL: ${urls.join(", ")}`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${SYSTEM_PROMPT}\n\n${prompt}`,
      config: {
        ...GENERATION_CONFIG,
        tools: [{ urlContext: {} }],
      },
    });
    return response.text || "Không đọc được link này.";
  } catch (error) {
    console.error("Gemini URL Error:", error);
    return "Lỗi đọc link, thử lại sau nhé!";
  }
}

/**
 * Generate content với nhiều YouTube videos
 */
export async function generateWithMultipleYouTube(
  prompt: string,
  youtubeUrls: string[]
): Promise<string> {
  try {
    console.log(`[Gemini] 🎬 Xử lý ${youtubeUrls.length} YouTube videos`);
    const contents: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }];
    for (const url of youtubeUrls.slice(0, 10)) {
      // Max 10 videos
      contents.push({ fileData: { fileUri: url } });
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: GENERATION_CONFIG,
    });
    return response.text || "Không xem được video này.";
  } catch (error) {
    console.error("Gemini YouTube Error:", error);
    return "Lỗi xử lý video YouTube, thử lại sau nhé!";
  }
}

// Legacy export for backward compatibility
export const getGeminiReply = generateContent;
