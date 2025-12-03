/**
 * History Loader - Tải lịch sử tin nhắn từ Zalo API
 */
import { Content } from "@google/genai";
import { CONFIG } from "../constants/config.js";
import { debugLog, logError } from "../../core/logger/logger.js";
import { toGeminiContent } from "./historyConverter.js";

/** Ngủ (Delay) */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Random delay từ min đến max */
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/** Lấy config pagination từ settings */
export function getPaginationConfig() {
  return {
    defaultLimit: CONFIG.historyLoader?.defaultLimit ?? 100,
    minDelay: CONFIG.historyLoader?.minDelayMs ?? 2000,
    maxDelay: CONFIG.historyLoader?.maxDelayMs ?? 5000,
    pageTimeout: CONFIG.historyLoader?.pageTimeoutMs ?? 10000,
  };
}

/**
 * Tải lịch sử tin nhắn phân trang an toàn (Pagination với Anti-Ban)
 */
export async function fetchFullHistory(
  api: any,
  type: number,
  limit?: number
): Promise<any[]> {
  const config = getPaginationConfig();
  const targetLimit = limit ?? config.defaultLimit;

  let allMessages: any[] = [];
  let lastMsgId: string | null = null;
  let hasMore = true;
  let pageCount = 0;

  console.log(
    `[History] ⏳ Bắt đầu tải lịch sử (Type: ${
      type === 0 ? "User" : "Group"
    }, Mục tiêu: ~${targetLimit} tin)...`
  );
  debugLog("HISTORY", `fetchFullHistory: type=${type}, limit=${targetLimit}`);

  while (hasMore && allMessages.length < targetLimit) {
    pageCount++;

    const batchMessages = await new Promise<any[]>((resolve) => {
      const handler = (msgs: any[], msgType: number) => {
        if (msgType !== type) return;
        api.listener.off("old_messages", handler);
        resolve(msgs);
      };

      api.listener.on("old_messages", handler);
      api.listener.requestOldMessages(type, lastMsgId);

      setTimeout(() => {
        api.listener.off("old_messages", handler);
        resolve([]);
      }, config.pageTimeout);
    });

    if (batchMessages.length === 0) {
      console.log("[History] ⚠️ Không còn tin nhắn cũ hơn hoặc bị timeout.");
      debugLog("HISTORY", `Page ${pageCount}: No more messages or timeout`);
      hasMore = false;
      break;
    }

    batchMessages.sort(
      (a, b) => parseInt(b.data.msgId) - parseInt(a.data.msgId)
    );

    allMessages = [...allMessages, ...batchMessages];

    const oldestMessageInBatch = batchMessages[batchMessages.length - 1];
    lastMsgId = oldestMessageInBatch.data.msgId;

    console.log(
      `[History]    + Trang ${pageCount}: Lấy được ${batchMessages.length} tin. (Tổng: ${allMessages.length})`
    );
    debugLog(
      "HISTORY",
      `Page ${pageCount}: ${batchMessages.length} messages, total=${allMessages.length}, lastMsgId=${lastMsgId}`
    );

    if (allMessages.length >= targetLimit) break;

    const waitTime = randomDelay(config.minDelay, config.maxDelay);
    console.log(
      `[History]    💤 Nghỉ ${(waitTime / 1000).toFixed(
        1
      )}s cho đỡ bị nghi là Bot...`
    );
    debugLog("HISTORY", `Sleeping ${waitTime}ms before next page`);
    await sleep(waitTime);
  }

  allMessages.sort((a, b) => parseInt(a.data.ts) - parseInt(b.data.ts));

  console.log(
    `[History] ✅ Hoàn tất! Đã tải tổng cộng ${allMessages.length} tin nhắn.`
  );
  debugLog(
    "HISTORY",
    `fetchFullHistory complete: ${allMessages.length} messages in ${pageCount} pages`
  );

  return allMessages;
}

/**
 * Load tin nhắn cũ từ cache hoặc API
 */
export async function loadOldMessages(
  api: any,
  threadId: string,
  type: number,
  preloadedMessages: Map<string, any[]>
): Promise<Content[]> {
  debugLog("HISTORY", `loadOldMessages: thread=${threadId}, type=${type}`);

  // Ưu tiên lấy từ preloaded cache
  if (preloadedMessages.has(threadId)) {
    const cachedMessages = preloadedMessages.get(threadId)!;
    cachedMessages.sort((a, b) => parseInt(a.data.ts) - parseInt(b.data.ts));

    console.log(
      `[History] 📚 Thread ${threadId}: Đang load ${cachedMessages.length} tin nhắn từ cache...`
    );
    debugLog(
      "HISTORY",
      `Loading ${cachedMessages.length} cached messages for thread ${threadId}`
    );

    const history: Content[] = [];
    for (const msg of cachedMessages) {
      const content = await toGeminiContent(msg);
      history.push(content);
    }

    console.log(
      `[History] ✅ Thread ${threadId}: Đã load ${history.length} tin nhắn từ cache`
    );
    debugLog(
      "HISTORY",
      `Loaded ${history.length} messages from cache for thread ${threadId}`
    );
    return history;
  }

  // Fallback: request từ Zalo API
  debugLog(
    "HISTORY",
    `No cached messages for ${threadId}, requesting from API`
  );

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`[History] ⚠️ Timeout lấy lịch sử thread ${threadId}`);
      debugLog("HISTORY", `Timeout loading history for thread ${threadId}`);
      resolve([]);
    }, 10000);

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
