import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { SYSTEM_PROMPT } from "../config/index.js";
import { fetchAsBase64 } from "../utils/fetch.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

// Legacy export for backward compatibility
export const getGeminiReply = generateContent;
