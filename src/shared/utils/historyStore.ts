/**
 * History Store - Lưu trữ và quản lý history
 */
import { Content } from "@google/genai";
import { CONFIG } from "../constants/config.js";
import { debugLog } from "../../core/logger/logger.js";
import { countTokens } from "./tokenCounter.js";
import { toGeminiContent } from "./historyConverter.js";
import {
  loadOldMessages,
  fetchFullHistory,
  getPaginationConfig,
} from "./historyLoader.js";

// Storage
const messageHistory = new Map<string, Content[]>();
const rawMessageHistory = new Map<string, any[]>();
const tokenCache = new Map<string, number>();
const initializedThreads = new Set<string>();
const preloadedMessages = new Map<string, any[]>();
let isPreloaded = false;

/** Ngủ (Delay) */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Random delay từ min đến max */
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

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
  const maxTrimAttempts = 50;

  while (
    currentTokens > maxTokens &&
    history.length > 2 &&
    trimCount < maxTrimAttempts
  ) {
    history.shift();
    rawHistory.shift();
    trimCount++;

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
 * Preload tất cả tin nhắn cũ từ Zalo khi bot start
 */
export async function preloadAllHistory(api: any): Promise<void> {
  if (isPreloaded) {
    debugLog("HISTORY", "Already preloaded, skipping");
    return;
  }

  if (CONFIG.historyLoader?.enabled === false) {
    console.log("[History] ⏭️ Preload history đã bị tắt trong config");
    debugLog("HISTORY", "Preload disabled in config, skipping");
    isPreloaded = true;
    return;
  }

  console.log("[History] 📥 Đang preload lịch sử chat (Pagination mode)...");
  debugLog("HISTORY", "Starting preload all history with pagination");

  try {
    const config = getPaginationConfig();
    let totalMsgs = 0;

    // Load User messages
    if (CONFIG.historyLoader.loadUser) {
      const userMessages = await fetchFullHistory(api, 0);

      const allowedIds = CONFIG.allowedUserIds;
      const filteredMessages =
        allowedIds.length > 0
          ? userMessages.filter((msg) => allowedIds.includes(msg.threadId))
          : userMessages;

      const skippedCount = userMessages.length - filteredMessages.length;
      if (skippedCount > 0) {
        console.log(
          `[History] 🔒 Bỏ qua ${skippedCount} tin từ user không được phép`
        );
      }

      for (const msg of filteredMessages) {
        const threadId = msg.threadId;
        if (!preloadedMessages.has(threadId)) {
          preloadedMessages.set(threadId, []);
        }
        preloadedMessages.get(threadId)!.push(msg);
      }
      debugLog(
        "HISTORY",
        `Preloaded ${filteredMessages.length} user messages (filtered from ${userMessages.length})`
      );
      totalMsgs += filteredMessages.length;

      if (userMessages.length > 0 && CONFIG.historyLoader.loadGroup) {
        const waitTime = randomDelay(config.minDelay, config.maxDelay);
        console.log(
          `[History] 💤 Nghỉ ${(waitTime / 1000).toFixed(
            1
          )}s trước khi load Group...`
        );
        await sleep(waitTime);
      }
    } else {
      console.log("[History] ⏭️ Bỏ qua load User messages (disabled)");
    }

    // Load Group messages
    if (CONFIG.historyLoader.loadGroup) {
      const groupMessages = await fetchFullHistory(api, 1);

      for (const msg of groupMessages) {
        const threadId = msg.threadId;
        if (!preloadedMessages.has(threadId)) {
          preloadedMessages.set(threadId, []);
        }
        preloadedMessages.get(threadId)!.push(msg);
      }
      debugLog("HISTORY", `Preloaded ${groupMessages.length} group messages`);
      totalMsgs += groupMessages.length;
    } else {
      console.log("[History] ⏭️ Bỏ qua load Group messages (disabled)");
    }

    isPreloaded = true;
    const threadCount = preloadedMessages.size;

    console.log(
      `[History] ✅ Preload xong: ${totalMsgs} tin nhắn từ ${threadCount} cuộc trò chuyện`
    );
    debugLog(
      "HISTORY",
      `Preload complete: ${totalMsgs} messages from ${threadCount} threads`
    );
  } catch (error) {
    console.log("[History] ⚠️ Preload gặp lỗi, tiếp tục với dữ liệu hiện có");
    isPreloaded = true;
  }
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
  const oldHistory = await loadOldMessages(
    api,
    threadId,
    type,
    preloadedMessages
  );

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
 * Lưu tin nhắn mới vào history
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
 * Lưu response text vào history
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
 * Lưu kết quả tool vào history
 */
export async function saveToolResultToHistory(
  threadId: string,
  toolResultPrompt: string
): Promise<void> {
  const history = messageHistory.get(threadId) || [];
  const rawHistory = rawMessageHistory.get(threadId) || [];

  history.push({
    role: "user",
    parts: [{ text: toolResultPrompt }],
  });
  rawHistory.push({
    isSelf: false,
    isToolResult: true,
    data: { content: toolResultPrompt },
  });

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);

  debugLog(
    "HISTORY",
    `Saved tool result to history: ${toolResultPrompt.substring(0, 100)}...`
  );
  await trimHistoryByTokens(threadId);
}

/** Lấy history dạng Gemini Content[] */
export function getHistory(threadId: string): Content[] {
  return messageHistory.get(threadId) || [];
}

/** Lấy số token hiện tại (từ cache) */
export function getCachedTokenCount(threadId: string): number {
  return tokenCache.get(threadId) || 0;
}

/** Xóa history của thread */
export function clearHistory(threadId: string): void {
  debugLog("HISTORY", `Clearing history for thread ${threadId}`);
  messageHistory.delete(threadId);
  rawMessageHistory.delete(threadId);
  tokenCache.delete(threadId);
  initializedThreads.delete(threadId);
}

/** Lấy raw Zalo messages (cho quote feature) */
export function getRawHistory(threadId: string): any[] {
  return rawMessageHistory.get(threadId) || [];
}

/** Kiểm tra thread đã được khởi tạo chưa */
export function isThreadInitialized(threadId: string): boolean {
  return initializedThreads.has(threadId);
}
