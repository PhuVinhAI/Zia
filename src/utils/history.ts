import { Content } from "@google/genai";
import { CONFIG } from "../config/index.js";
import { ai } from "../services/gemini.js";

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
    // Fallback: ước tính ~4 chars = 1 token
    const text = JSON.stringify(contents);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Convert raw Zalo message sang Gemini Content format
 */
function toGeminiContent(msg: any): Content {
  const role = msg.isSelf ? "model" : "user";
  const text =
    typeof msg.data?.content === "string"
      ? msg.data.content
      : "[Hình ảnh/Sticker]";
  return {
    role,
    parts: [{ text }],
  };
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
    }, 5000);

    const handler = (messages: any[], msgType: number) => {
      if (msgType !== type) return;

      const threadMessages = messages.filter((m) => m.threadId === threadId);
      threadMessages.sort((a, b) => parseInt(a.data.ts) - parseInt(b.data.ts));

      const history: Content[] = threadMessages.map((msg) => ({
        role: msg.isSelf ? "model" : "user",
        parts: [
          {
            text:
              typeof msg.data.content === "string"
                ? msg.data.content
                : "[Hình ảnh/Sticker]",
          },
        ],
      }));

      clearTimeout(timeout);
      api.listener.off("old_messages", handler);
      console.log(
        `[History] 📚 Thread ${threadId}: Tải được ${history.length} tin nhắn cũ`
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
 * Lưu tin nhắn mới vào history
 */
export async function saveToHistory(
  threadId: string,
  message: any
): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  history.push(toGeminiContent(message));
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
 * Lấy history dạng text context (cho prompt)
 */
export function getHistoryContext(threadId: string): string {
  const history = getHistory(threadId);
  if (history.length === 0) return "";

  return history
    .map((msg, index) => {
      const sender = msg.role === "model" ? "Bot" : "User";
      const text =
        msg.parts?.[0] && "text" in msg.parts[0]
          ? msg.parts[0].text
          : "(media)";
      return `[${index}] ${sender}: ${text}`;
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
