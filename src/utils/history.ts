import { Content, Part } from "@google/genai";
import { CONFIG } from "../config/index.js";
import { ai } from "../services/gemini.js";
import { fetchAsBase64 } from "./fetch.js";

const messageHistory = new Map<string, Content[]>();
const tokenCache = new Map<string, number>();
const initializedThreads = new Set<string>();

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Đếm token của một content array
 */
export async function countTokens(contents: Content[]): Promise<number> {
  if (contents.length === 0) return 0;
  try {
    const result = await ai.models.countTokens({
      model: GEMINI_MODEL,
      contents,
    });
    return result.totalTokens || 0;
  } catch (error) {
    console.error("[History] Token count error:", error);
    const text = JSON.stringify(contents);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Lấy URL media từ message content
 */
function getMediaUrl(content: any): string | null {
  if (!content) return null;
  return (
    content.href || content.hdUrl || content.thumbUrl || content.thumb || null
  );
}

/**
 * Lấy MIME type từ msgType
 */
function getMimeType(msgType: string, content: any): string {
  if (msgType?.includes("photo") || msgType === "webchat") return "image/png";
  if (msgType?.includes("video")) return "video/mp4";
  if (msgType?.includes("voice")) return "audio/aac";
  if (msgType?.includes("sticker")) return "image/png";
  if (msgType?.includes("file")) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const ext = params?.fileExt?.toLowerCase()?.replace(".", "") || "";
    return CONFIG.mimeTypes[ext] || "application/octet-stream";
  }
  return "application/octet-stream";
}

/**
 * Convert raw Zalo message sang Gemini Content format (với media support)
 */
async function toGeminiContent(msg: any): Promise<Content> {
  const role = msg.isSelf ? "model" : "user";
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || "";
  const parts: Part[] = [];

  // Text message
  if (typeof content === "string") {
    parts.push({ text: content });
    return { role, parts };
  }

  // Media messages
  const mediaUrl = getMediaUrl(content);
  const isMedia =
    msgType.includes("photo") ||
    msgType.includes("video") ||
    msgType.includes("voice") ||
    msgType.includes("sticker") ||
    msgType.includes("file") ||
    msgType === "webchat";

  if (isMedia && mediaUrl) {
    try {
      // Thêm mô tả text
      let description = "";
      if (msgType.includes("sticker")) description = "[Sticker]";
      else if (msgType.includes("photo") || msgType === "webchat")
        description = "[Hình ảnh]";
      else if (msgType.includes("video")) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration
          ? Math.round(params.duration / 1000)
          : 0;
        description = `[Video ${duration}s]`;
      } else if (msgType.includes("voice")) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration
          ? Math.round(params.duration / 1000)
          : 0;
        description = `[Voice ${duration}s]`;
      } else if (msgType.includes("file")) {
        const fileName = content?.title || "file";
        description = `[File: ${fileName}]`;
      }

      if (description) {
        parts.push({ text: description });
      }

      // Fetch và thêm media data
      const base64Data = await fetchAsBase64(mediaUrl);
      if (base64Data) {
        const mimeType = getMimeType(msgType, content);
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType,
          },
        });
        console.log(`[History] 📎 Loaded media: ${description} (${mimeType})`);
      } else {
        parts.push({ text: `${description} (không tải được)` });
      }
    } catch (e) {
      console.error("[History] Error loading media:", e);
      parts.push({ text: "[Media không tải được]" });
    }
  } else {
    // Fallback cho các loại khác
    parts.push({ text: "[Nội dung không xác định]" });
  }

  return { role, parts };
}

/**
 * Lấy lịch sử chat cũ từ Zalo API và convert sang format Gemini
 */
export async function loadOldMessages(
  api: any,
  threadId: string,
  type: number
): Promise<Content[]> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`[History] ⚠️ Timeout lấy lịch sử thread ${threadId}`);
      resolve([]);
    }, 10000); // Tăng timeout vì cần fetch media

    const handler = async (messages: any[], msgType: number) => {
      if (msgType !== type) return;

      const threadMessages = messages.filter((m) => m.threadId === threadId);
      threadMessages.sort((a, b) => parseInt(a.data.ts) - parseInt(b.data.ts));

      clearTimeout(timeout);
      api.listener.off("old_messages", handler);

      console.log(
        `[History] 📚 Thread ${threadId}: Đang load ${threadMessages.length} tin nhắn cũ...`
      );

      // Convert tất cả messages (bao gồm media)
      const history: Content[] = [];
      for (const msg of threadMessages) {
        const content = await toGeminiContent(msg);
        history.push(content);
      }

      console.log(
        `[History] ✅ Thread ${threadId}: Đã load ${history.length} tin nhắn`
      );
      resolve(history);
    };

    api.listener.on("old_messages", handler);
    api.listener.requestOldMessages(type, null);
  });
}

/**
 * Khởi tạo history cho thread từ Zalo (chỉ chạy 1 lần)
 */
export async function initThreadHistory(
  api: any,
  threadId: string,
  type: number
): Promise<void> {
  if (initializedThreads.has(threadId)) return;

  initializedThreads.add(threadId);
  const oldHistory = await loadOldMessages(api, threadId, type);

  if (oldHistory.length > 0) {
    messageHistory.set(threadId, oldHistory);
    await trimHistoryByTokens(threadId);
  }
}

/**
 * Xóa lịch sử cũ từ từ cho đến khi dưới ngưỡng token
 */
async function trimHistoryByTokens(threadId: string): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  if (history.length === 0) return;

  const maxTokens = CONFIG.maxTokenHistory;
  let currentTokens = await countTokens(history);

  console.log(
    `[History] Thread ${threadId}: ${currentTokens} tokens (max: ${maxTokens})`
  );

  while (currentTokens > maxTokens && history.length > 2) {
    history.shift();
    currentTokens = await countTokens(history);
    console.log(`[History] Trimmed -> ${currentTokens} tokens`);
  }

  messageHistory.set(threadId, history);
  tokenCache.set(threadId, currentTokens);
}

/**
 * Lưu tin nhắn mới vào history (với media support)
 */
export async function saveToHistory(
  threadId: string,
  message: any
): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  const content = await toGeminiContent(message);
  history.push(content);
  messageHistory.set(threadId, history);
  await trimHistoryByTokens(threadId);
}

/**
 * Lưu response text vào history (cho bot response)
 */
export async function saveResponseToHistory(
  threadId: string,
  responseText: string
): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  history.push({
    role: "model",
    parts: [{ text: responseText }],
  });
  messageHistory.set(threadId, history);
  await trimHistoryByTokens(threadId);
}

/**
 * Lấy history dạng Gemini Content[]
 */
export function getHistory(threadId: string): Content[] {
  return messageHistory.get(threadId) || [];
}

/**
 * Lấy history dạng text context (cho prompt) - chỉ lấy text parts
 */
export function getHistoryContext(threadId: string): string {
  const history = getHistory(threadId);
  if (history.length === 0) return "";

  return history
    .map((msg, index) => {
      const sender = msg.role === "model" ? "Bot" : "User";
      const textParts = msg.parts
        ?.filter((p): p is { text: string } => "text" in p)
        .map((p) => p.text)
        .join(" ");
      return `[${index}] ${sender}: ${textParts || "(media)"}`;
    })
    .join("\n");
}

/**
 * Lấy số token hiện tại (từ cache)
 */
export function getCachedTokenCount(threadId: string): number {
  return tokenCache.get(threadId) || 0;
}

/**
 * Xóa history của thread
 */
export function clearHistory(threadId: string): void {
  messageHistory.delete(threadId);
  tokenCache.delete(threadId);
  initializedThreads.delete(threadId);
}

/**
 * Kiểm tra thread đã được khởi tạo chưa
 */
export function isThreadInitialized(threadId: string): boolean {
  return initializedThreads.has(threadId);
}
