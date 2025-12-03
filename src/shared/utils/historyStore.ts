/**
 * History Store - Lưu trữ và quản lý history
 * Hybrid: In-memory cache + SQLite persistence
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
import { historyRepository } from "../../infrastructure/database/index.js";

// In-memory cache (primary storage for fast access)
const messageHistory = new Map<string, Content[]>();
const rawMessageHistory = new Map<string, any[]>();
const tokenCache = new Map<string, number>();
const initializedThreads = new Set<string>();
const preloadedMessages = new Map<string, any[]>();
let isPreloaded = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Persist message to database (async, non-blocking)
 */
async function persistToDb(
  threadId: string,
  role: "user" | "model",
  content: Content
): Promise<void> {
  try {
    const serialized = JSON.stringify(content.parts);
    await historyRepository.addMessage(threadId, role, serialized);
  } catch (err) {
    debugLog("HISTORY", `DB persist error: ${err}`);
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
    `trimHistoryByTokens: thread=${threadId}, tokens=${currentTokens}, max=${maxTokens}`
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
    }
  }

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);
  tokenCache.set(threadId, currentTokens);
}

/**
 * Preload tất cả tin nhắn cũ từ Zalo khi bot start
 */
export async function preloadAllHistory(api: any): Promise<void> {
  if (isPreloaded) return;

  if (CONFIG.historyLoader?.enabled === false) {
    console.log("[History] ⏭️ Preload history đã bị tắt trong config");
    isPreloaded = true;
    return;
  }

  console.log("[History] 📥 Đang preload lịch sử chat (Pagination mode)...");

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

      for (const msg of filteredMessages) {
        const threadId = msg.threadId;
        if (!preloadedMessages.has(threadId)) {
          preloadedMessages.set(threadId, []);
        }
        preloadedMessages.get(threadId)!.push(msg);
      }
      totalMsgs += filteredMessages.length;

      if (userMessages.length > 0 && CONFIG.historyLoader.loadGroup) {
        const waitTime = randomDelay(config.minDelay, config.maxDelay);
        console.log(`[History] 💤 Nghỉ ${(waitTime / 1000).toFixed(1)}s...`);
        await sleep(waitTime);
      }
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
      totalMsgs += groupMessages.length;
    }

    isPreloaded = true;
    console.log(
      `[History] ✅ Preload xong: ${totalMsgs} tin từ ${preloadedMessages.size} threads`
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
  if (initializedThreads.has(threadId)) return;

  debugLog("HISTORY", `Initializing history for thread ${threadId}`);
  initializedThreads.add(threadId);

  // Thử load từ database trước (nếu được bật)
  if (CONFIG.historyLoader?.loadFromDb !== false) {
    const dbHistory = await historyRepository.getHistoryForAI(threadId);
    if (dbHistory.length > 0) {
      console.log(
        `[History] 📚 Thread ${threadId}: Loaded ${dbHistory.length} messages from DB`
      );
      messageHistory.set(threadId, dbHistory as Content[]);
      await trimHistoryByTokens(threadId);
      return;
    }
  } else {
    debugLog("HISTORY", `Load from DB disabled, skipping DB history`);
  }

  // Fallback: load từ Zalo API (nếu enabled)
  if (CONFIG.historyLoader?.enabled !== false) {
    const oldHistory = await loadOldMessages(
      api,
      threadId,
      type,
      preloadedMessages
    );

    if (oldHistory.length > 0) {
      messageHistory.set(threadId, oldHistory);
      await trimHistoryByTokens(threadId);

      // Persist to DB (async)
      for (const content of oldHistory) {
        persistToDb(threadId, content.role as "user" | "model", content);
      }
    }
  } else {
    debugLog("HISTORY", `Load from Zalo disabled, starting with empty history`);
  }
}

/**
 * Lưu tin nhắn mới vào history
 */
export async function saveToHistory(
  threadId: string,
  message: any
): Promise<void> {
  debugLog("HISTORY", `saveToHistory: thread=${threadId}`);

  const history = messageHistory.get(threadId) || [];
  const rawHistory = rawMessageHistory.get(threadId) || [];

  const content = await toGeminiContent(message);
  history.push(content);
  rawHistory.push(message);

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);

  // Persist to DB
  persistToDb(threadId, "user", content);

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

  const content: Content = {
    role: "model",
    parts: [{ text: responseText }],
  };

  history.push(content);
  rawHistory.push({ isSelf: true, data: { content: responseText } });

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);

  // Persist to DB
  persistToDb(threadId, "model", content);

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

  const content: Content = {
    role: "user",
    parts: [{ text: toolResultPrompt }],
  };

  history.push(content);
  rawHistory.push({
    isSelf: false,
    isToolResult: true,
    data: { content: toolResultPrompt },
  });

  messageHistory.set(threadId, history);
  rawMessageHistory.set(threadId, rawHistory);

  // Persist to DB
  persistToDb(threadId, "user", content);

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

  // Clear from DB (async)
  historyRepository.clearHistory(threadId).catch((err) => {
    debugLog("HISTORY", `DB clear error: ${err}`);
  });
}

/** Lấy raw Zalo messages (cho quote feature) */
export function getRawHistory(threadId: string): any[] {
  return rawMessageHistory.get(threadId) || [];
}

/** Kiểm tra thread đã được khởi tạo chưa */
export function isThreadInitialized(threadId: string): boolean {
  return initializedThreads.has(threadId);
}
