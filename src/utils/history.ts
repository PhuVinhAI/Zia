import { Content, Part } from "@google/genai";
import { CONFIG } from "../config/index.js";
import { ai } from "../services/gemini.js";
import { fetchAsBase64 } from "./fetch.js";
import { debugLog, logError } from "./logger.js";

const messageHistory = new Map<string, Content[]>();
const rawMessageHistory = new Map<string, any[]>(); // Lưu raw Zalo messages cho quote
const tokenCache = new Map<string, number>();
const initializedThreads = new Set<string>();

const GEMINI_MODEL = "gemini-2.5-flash";

// MIME types mà Gemini API hỗ trợ cho countTokens
const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mp3",
  "audio/wav",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "application/pdf",
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
];

/**
 * Lọc bỏ các inline data có MIME type không được hỗ trợ
 */
function filterUnsupportedMedia(contents: Content[]): Content[] {
  return contents.map((content) => ({
    ...content,
    parts:
      content.parts?.map((part) => {
        if ("inlineData" in part && part.inlineData) {
          const mimeType = part.inlineData.mimeType || "";
          // Nếu MIME type không được hỗ trợ, thay bằng text mô tả
          if (
            !SUPPORTED_MIME_TYPES.some((t) =>
              mimeType.startsWith(t.split("/")[0])
            )
          ) {
            return { text: `[File: ${mimeType}]` };
          }
        }
        return part;
      }) || [],
  }));
}

/**
 * Đếm token của một content array
 */
export async function countTokens(contents: Content[]): Promise<number> {
  if (contents.length === 0) return 0;
  try {
    // Lọc bỏ media không hỗ trợ trước khi đếm
    const filteredContents = filterUnsupportedMedia(contents);
    const result = await ai.models.countTokens({
      model: GEMINI_MODEL,
      contents: filteredContents,
    });
    return result.totalTokens || 0;
  } catch (error: any) {
    // Fallback: ước tính dựa trên text length
    logError("countTokens", error);
    console.error("[History] Token count error (fallback):", error);
    const text = contents
      .flatMap(
        (c) =>
          c.parts?.filter((p) => "text" in p).map((p) => (p as any).text) || []
      )
      .join(" ");
    const estimated = Math.ceil(text.length / 4) + contents.length * 100;
    debugLog("HISTORY", `Token fallback estimate: ${estimated}`);
    return estimated;
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
 * Trả về null nếu không hỗ trợ (để skip việc lưu media vào history)
 */
function getMimeType(msgType: string, content: any): string | null {
  if (msgType?.includes("photo") || msgType === "webchat") return "image/png";
  if (msgType?.includes("video")) return "video/mp4";
  if (msgType?.includes("voice")) return "audio/aac";
  if (msgType?.includes("sticker")) return "image/png";
  if (msgType?.includes("file")) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const ext = params?.fileExt?.toLowerCase()?.replace(".", "") || "";
    const mimeType = CONFIG.mimeTypes[ext];
    // Chỉ trả về nếu là MIME type được Gemini hỗ trợ
    if (
      mimeType &&
      SUPPORTED_MIME_TYPES.some((t) => mimeType.startsWith(t.split("/")[0]))
    ) {
      return mimeType;
    }
    return null; // Không hỗ trợ
  }
  return null;
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
      const mimeType = getMimeType(msgType, content);
      if (mimeType) {
        const base64Data = await fetchAsBase64(mediaUrl);
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
          console.log(
            `[History] 📎 Loaded media: ${description} (${mimeType})`
          );
        } else {
          parts.push({ text: `${description} (không tải được)` });
        }
      } else {
        // MIME type không được hỗ trợ, chỉ lưu text mô tả
        console.log(`[History] ⚠️ Skipped unsupported media: ${description}`);
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
  debugLog("HISTORY", `loadOldMessages: thread=${threadId}, type=${type}`);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`[History] ⚠️ Timeout lấy lịch sử thread ${threadId}`);
      debugLog("HISTORY", `Timeout loading history for thread ${threadId}`);
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
      debugLog(
        "HISTORY",
        `Loading ${threadMessages.length} old messages for thread ${threadId}`
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
      debugLog(
        "HISTORY",
        `Loaded ${history.length} messages for thread ${threadId}`
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
  if (initializedThreads.has(threadId)) {
    debugLog("HISTORY", `Thread ${threadId} already initialized, skipping`);
    return;
  }

  debugLog("HISTORY", `Initializing history for thread ${threadId}`);
  initializedThreads.add(threadId);
  const oldHistory = await loadOldMessages(api, threadId, type);

  if (oldHistory.length > 0) {
    messageHistory.set(threadId, oldHistory);
    debugLog(
      "HISTORY",
      `Set ${oldHistory.length} messages for thread ${threadId}`
    );
    await trimHistoryByTokens(threadId);
  } else {
    debugLog("HISTORY", `No old messages found for thread ${threadId}`);
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
  debugLog(
    "HISTORY",
    `trimHistoryByTokens: thread=${threadId}, tokens=${currentTokens}, max=${maxTokens}, messages=${history.length}`
  );

  const rawHistory = rawMessageHistory.get(threadId) || [];
  let trimCount = 0;
  const maxTrimAttempts = 50; // Giới hạn số lần trim để tránh vòng lặp vô hạn

  while (
    currentTokens > maxTokens &&
    history.length > 2 &&
    trimCount < maxTrimAttempts
  ) {
    history.shift();
    rawHistory.shift();
    trimCount++;

    // Chỉ đếm lại token mỗi 5 lần trim để tối ưu performance
    if (trimCount % 5 === 0 || history.length <= 2) {
      currentTokens = await countTokens(history);
      console.log(
        `[History] Trimmed ${trimCount} messages -> ${currentTokens} tokens`
      );
      debugLog(
        "HISTORY",
        `Trimmed ${trimCount} messages, now ${currentTokens} tokens, ${history.length} messages`
      );
    }
  }

  if (trimCount >= maxTrimAttempts) {
    console.warn(
      `[History] ⚠️ Max trim attempts reached for thread ${threadId}`
    );
    debugLog(
      "HISTORY",
      `WARNING: Max trim attempts (${maxTrimAttempts}) reached for thread ${threadId}`
    );
  }

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);
  tokenCache.set(threadId, currentTokens);

  if (trimCount > 0) {
    debugLog(
      "HISTORY",
      `Trim complete: removed ${trimCount} messages, final=${history.length} messages, ${currentTokens} tokens`
    );
  }
}

/**
 * Lưu tin nhắn mới vào history (với media support)
 */
export async function saveToHistory(
  threadId: string,
  message: any
): Promise<void> {
  debugLog(
    "HISTORY",
    `saveToHistory: thread=${threadId}, msgType=${message.data?.msgType}`
  );

  const history = messageHistory.get(threadId) || [];
  const rawHistory = rawMessageHistory.get(threadId) || [];

  const content = await toGeminiContent(message);
  history.push(content);
  rawHistory.push(message);

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);

  debugLog("HISTORY", `History size: ${history.length} messages`);
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
  const rawHistory = rawMessageHistory.get(threadId) || [];

  history.push({
    role: "model",
    parts: [{ text: responseText }],
  });
  rawHistory.push({
    isSelf: true,
    data: { content: responseText },
  });

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);
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
  debugLog("HISTORY", `Clearing history for thread ${threadId}`);
  messageHistory.delete(threadId);
  rawMessageHistory.delete(threadId);
  tokenCache.delete(threadId);
  initializedThreads.delete(threadId);
}

/**
 * Lấy raw Zalo messages (cho quote feature)
 */
export function getRawHistory(threadId: string): any[] {
  return rawMessageHistory.get(threadId) || [];
}

/**
 * Kiểm tra thread đã được khởi tạo chưa
 */
export function isThreadInitialized(threadId: string): boolean {
  return initializedThreads.has(threadId);
}
