import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../config/index.js";
import {
  AIResponse,
  DEFAULT_RESPONSE,
  parseAIResponse,
} from "../config/schema.js";
import { fetchAsBase64 } from "../utils/fetch.js";
import {
  logAIResponse,
  logError,
  debugLog,
  logStep,
  logAPI,
} from "../utils/logger.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

debugLog("GEMINI", "Initializing Gemini API...");

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ============ GEMINI CONFIG - CHỈ CHỈNH Ở ĐÂY ============
export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_CONFIG = {
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
    debugLog("GEMINI", `Creating new chat session for thread: ${threadId}`);
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
  debugLog("GEMINI", `Clearing chat session for thread: ${threadId}`);
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
    debugLog(
      "GEMINI",
      `sendMessage: thread=${threadId}, msg="${message.substring(0, 100)}..."`
    );
    const chat = getChatSession(threadId);
    const response = await chat.sendMessage({ message });
    const result = response.text || "Không có phản hồi từ AI.";
    debugLog("GEMINI", `Response: ${result.substring(0, 200)}...`);
    return result;
  } catch (error) {
    logError("sendMessage", error);
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
    console.log(`[Gemini] 🖼️ Xử lý ảnh: ${imageUrl.substring(0, 80)}...`);
    logStep("generateWithImage", {
      prompt: prompt.substring(0, 100),
      imageUrl: imageUrl.substring(0, 80),
    });

    const base64Image = await fetchAsBase64(imageUrl);
    if (!base64Image) {
      debugLog("GEMINI", "Failed to fetch image");
      return {
        reactions: ["sad"],
        messages: [
          { text: "Không tải được hình ảnh.", sticker: "", quoteIndex: -1 },
        ],
        undoIndexes: [],
      };
    }

    debugLog("GEMINI", `Image loaded: ${base64Image.length} chars base64`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Image, mimeType: "image/png" } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[IMAGE] ${prompt}`, rawText);
    const parsed = parseAIResponse(rawText);
    debugLog("GEMINI", `Parsed response: ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (error) {
    logError("generateWithImage", error);
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
    logStep("generateWithAudio", {
      prompt: prompt.substring(0, 100),
      audioUrl: audioUrl.substring(0, 80),
      mimeType,
    });

    const base64Audio = await fetchAsBase64(audioUrl);
    if (!base64Audio) {
      debugLog("GEMINI", "Failed to fetch audio");
      return {
        reactions: ["sad"],
        messages: [
          { text: "Không tải được audio.", sticker: "", quoteIndex: -1 },
        ],
        undoIndexes: [],
      };
    }

    debugLog("GEMINI", `Audio loaded: ${base64Audio.length} chars base64`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Audio, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[AUDIO] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithAudio", error);
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
    logStep("generateWithFile", {
      prompt: prompt.substring(0, 100),
      fileUrl: fileUrl.substring(0, 80),
      mimeType,
    });

    const base64File = await fetchAsBase64(fileUrl);
    if (!base64File) {
      debugLog("GEMINI", "Failed to fetch file");
      return {
        reactions: ["sad"],
        messages: [
          { text: "Không tải được file.", sticker: "", quoteIndex: -1 },
        ],
        undoIndexes: [],
      };
    }

    debugLog(
      "GEMINI",
      `File loaded: ${base64File.length} chars base64, mimeType=${mimeType}`
    );

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64File, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[FILE] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithFile", error);
    console.error("Gemini File Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content đơn giản (không có media) - có Google Search + URL Context
 */
export async function generateContent(prompt: string): Promise<AIResponse> {
  try {
    logStep("generateContent", { promptLength: prompt.length });
    debugLog("GEMINI", `Prompt: ${prompt.substring(0, 300)}...`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      config: GEMINI_CONFIG,
    });
    const rawText = response.text || "{}";
    logAIResponse(prompt, rawText);
    const parsed = parseAIResponse(rawText);
    debugLog(
      "GEMINI",
      `Parsed: reactions=${parsed.reactions}, messages=${parsed.messages.length}`
    );
    return parsed;
  } catch (error) {
    logError("generateContent", error);
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
    logStep("generateWithBase64", {
      prompt: prompt.substring(0, 100),
      dataLength: base64Data.length,
      mimeType,
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Data, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[BASE64] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithBase64", error);
    console.error("Gemini Base64 Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với nhiều hình ảnh (multimodal)
 */
export async function generateWithMultipleImages(
  prompt: string,
  imageUrls: string[]
): Promise<AIResponse> {
  try {
    console.log(`[Gemini] 🖼️ Xử lý ${imageUrls.length} ảnh`);
    logStep("generateWithMultipleImages", {
      imageCount: imageUrls.length,
      prompt: prompt.substring(0, 100),
    });

    const contents: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }];
    let loadedCount = 0;

    for (const url of imageUrls) {
      const base64Image = await fetchAsBase64(url);
      if (base64Image) {
        contents.push({
          inlineData: { data: base64Image, mimeType: "image/png" },
        });
        loadedCount++;
        debugLog(
          "GEMINI",
          `Loaded image ${loadedCount}/${imageUrls.length}: ${base64Image.length} chars`
        );
      }
    }

    if (contents.length === 1) {
      // Không có ảnh nào load được
      debugLog("GEMINI", "No images loaded successfully");
      return {
        reactions: ["sad"],
        messages: [
          { text: "Không tải được hình ảnh.", sticker: "", quoteIndex: -1 },
        ],
        undoIndexes: [],
      };
    }

    debugLog("GEMINI", `Sending ${loadedCount} images to Gemini`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[${imageUrls.length} IMAGES] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithMultipleImages", error);
    console.error("Gemini Multiple Images Error:", error);
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
    logStep("generateWithVideo", {
      prompt: prompt.substring(0, 100),
      videoUrl: videoUrl.substring(0, 80),
      mimeType,
    });

    const base64Video = await fetchAsBase64(videoUrl);
    if (!base64Video) {
      debugLog("GEMINI", "Failed to fetch video");
      return {
        reactions: ["sad"],
        messages: [
          { text: "Không tải được video.", sticker: "", quoteIndex: -1 },
        ],
        undoIndexes: [],
      };
    }

    debugLog("GEMINI", `Video loaded: ${base64Video.length} chars base64`);

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { inlineData: { data: base64Video, mimeType } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[VIDEO] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithVideo", error);
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
    logStep("generateWithYouTube", {
      prompt: prompt.substring(0, 100),
      youtubeUrl,
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { fileData: { fileUri: youtubeUrl } },
      ],
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[YOUTUBE] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithYouTube", error);
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
    logStep("generateWithMultipleYouTube", {
      videoCount: youtubeUrls.length,
      urls: youtubeUrls,
    });

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

    const rawText = response.text || "{}";
    logAIResponse(`[${youtubeUrls.length} YOUTUBE] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithMultipleYouTube", error);
    console.error("Gemini YouTube Error:", error);
    return DEFAULT_RESPONSE;
  }
}

/**
 * Generate content với mixed media (nhiều loại media cùng lúc)
 * Hỗ trợ: image, video, audio, file
 */
export async function generateWithMixedContent(
  prompt: string,
  mediaParts: Array<{
    type: "image" | "video" | "audio" | "file";
    url: string;
    mimeType: string;
  }>
): Promise<AIResponse> {
  try {
    console.log(`[Gemini] 📦 Xử lý ${mediaParts.length} media parts`);
    logStep("generateWithMixedContent", {
      mediaCount: mediaParts.length,
      types: mediaParts.map((p) => p.type),
      prompt: prompt.substring(0, 100),
    });

    const contents: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }];
    let loadedCount = 0;

    for (const part of mediaParts) {
      try {
        const base64Data = await fetchAsBase64(part.url);
        if (base64Data) {
          contents.push({
            inlineData: { data: base64Data, mimeType: part.mimeType },
          });
          loadedCount++;
          debugLog(
            "GEMINI",
            `Loaded ${part.type}: ${base64Data.length} chars (${part.mimeType})`
          );
        } else {
          debugLog("GEMINI", `Failed to load ${part.type}: ${part.url}`);
        }
      } catch (e) {
        debugLog("GEMINI", `Error loading ${part.type}: ${e}`);
      }
    }

    if (contents.length === 1) {
      // Không có media nào load được, chỉ có text
      debugLog("GEMINI", "No media loaded, using text-only");
      return generateContent(prompt);
    }

    debugLog(
      "GEMINI",
      `Sending ${loadedCount}/${mediaParts.length} media to Gemini`
    );

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: GEMINI_CONFIG,
    });

    const rawText = response.text || "{}";
    logAIResponse(`[MIXED ${loadedCount} media] ${prompt}`, rawText);
    return parseAIResponse(rawText);
  } catch (error) {
    logError("generateWithMixedContent", error);
    console.error("Gemini Mixed Content Error:", error);
    return DEFAULT_RESPONSE;
  }
}

// Legacy export for backward compatibility
export const getGeminiReply = generateContent;
