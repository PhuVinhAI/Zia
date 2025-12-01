import { CONFIG } from "../config/index.js";
import { ai } from "../services/gemini.js";

const messageHistory = new Map<string, any[]>();
const tokenCache = new Map<string, number>(); // Cache token count per thread

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Đếm token của một content array
 */
export async function countTokens(contents: any[]): Promise<number> {
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
 * Chuyển đổi history message sang format Gemini Content
 */
function toGeminiContent(msg: any): any {
  const role = msg.isSelf ? "model" : "user";
  const text =
    typeof msg.data?.content === "string" ? msg.data.content : "(media)";
  return {
    role,
    parts: [{ text }],
  };
}

/**
 * Xóa lịch sử cũ từ từ cho đến khi dưới ngưỡng token
 */
async function trimHistoryByTokens(threadId: string): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  if (history.length === 0) return;

  const maxTokens = CONFIG.maxTokenHistory;
  let contents = history.map(toGeminiContent);
  let currentTokens = await countTokens(contents);

  console.log(
    `[History] Thread ${threadId}: ${currentTokens} tokens (max: ${maxTokens})`
  );

  // Xóa từ từ tin nhắn cũ nhất cho đến khi dưới ngưỡng
  while (currentTokens > maxTokens && history.length > 2) {
    // Giữ ít nhất 2 tin nhắn
    const removed = history.shift();
    console.log(`[History] Removed old message to free tokens`);

    contents = history.map(toGeminiContent);
    currentTokens = await countTokens(contents);
    console.log(`[History] After trim: ${currentTokens} tokens`);
  }

  messageHistory.set(threadId, history);
  tokenCache.set(threadId, currentTokens);
}

export async function saveToHistory(threadId: string, message: any) {
  const history = messageHistory.get(threadId) || [];
  history.push(message);
  messageHistory.set(threadId, history);

  // Trim history nếu vượt quá token limit
  await trimHistoryByTokens(threadId);
}

export function getHistory(threadId: string): any[] {
  return messageHistory.get(threadId) || [];
}

export function getHistoryContext(threadId: string): string {
  const history = getHistory(threadId);
  if (history.length === 0) return "";

  return history
    .map((msg, index) => {
      const sender = msg.isSelf ? "Bot" : "User";
      const content =
        typeof msg.data?.content === "string" ? msg.data.content : "(media)";
      return `[${index}] ${sender}: ${content}`;
    })
    .join("\n");
}

/**
 * Lấy history dưới dạng Gemini Content format
 */
export function getGeminiHistory(threadId: string): any[] {
  const history = getHistory(threadId);
  return history.map(toGeminiContent);
}

/**
 * Lấy số token hiện tại của thread (từ cache)
 */
export function getCachedTokenCount(threadId: string): number {
  return tokenCache.get(threadId) || 0;
}

export function clearHistory(threadId: string) {
  messageHistory.delete(threadId);
  tokenCache.delete(threadId);
}
