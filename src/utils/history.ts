import { Content, Part } from "@google/genai";
import { CONFIG } from "../config/index.js";
import { ai } from "../services/gemini.js";
import { fetchAsBase64 } from "./fetch.js";
import { debugLog, logError } from "./logger.js";

const messageHistory = new Map<string, Content[]>();
const rawMessageHistory = new Map<string, any[]>(); // Lưu raw Zalo messages cho quote
const tokenCache = new Map<string, number>();
const initializedThreads = new Set<string>();

// Cache tin nhắn cũ từ Zalo khi bot start
const preloadedMessages = new Map<string, any[]>();
let isPreloaded = false;

const GEMINI_MODEL = "models/gemini-flash-latest";

// ========== PAGINATION HISTORY LOADER ==========
// Cơ chế cào lịch sử tin nhắn theo trang với delay anti-ban

/** Ngủ (Delay) */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Random delay từ min đến max (để không bị máy móc) */
const randomDelay = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/** Lấy config pagination từ settings */
const getPaginationConfig = () => ({
  defaultLimit: CONFIG.historyLoader?.defaultLimit ?? 100,
  minDelay: CONFIG.historyLoader?.minDelayMs ?? 2000,
  maxDelay: CONFIG.historyLoader?.maxDelayMs ?? 5000,
  pageTimeout: CONFIG.historyLoader?.pageTimeoutMs ?? 10000,
});

// MIME types mà Gemini API hỗ trợ cho countTokens
const SUPPORTED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "text/",
];

/** Kiểm tra MIME type có được hỗ trợ không */
const isSupportedMime = (mime: string) =>
  SUPPORTED_MIME_PREFIXES.some((p) => mime.startsWith(p.split("/")[0]));

/** Lọc bỏ các inline data có MIME type không được hỗ trợ */
function filterUnsupportedMedia(contents: Content[]): Content[] {
  return contents.map((content) => ({
    ...content,
    parts:
      content.parts?.map((part) => {
        if ("inlineData" in part && part.inlineData) {
          const mimeType = part.inlineData.mimeType || "";
          if (!isSupportedMime(mimeType))
            return { text: `[File: ${mimeType}]` };
        }
        return part;
      }) || [],
  }));
}

/** Đếm token của một content array */
export async function countTokens(contents: Content[]): Promise<number> {
  if (contents.length === 0) return 0;
  try {
    const result = await ai.models.countTokens({
      model: GEMINI_MODEL,
      contents: filterUnsupportedMedia(contents),
    });
    return result.totalTokens || 0;
  } catch (error: any) {
    logError("countTokens", error);
    // Fallback: ước tính dựa trên text length
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

/** Lấy URL media từ message content */
const getMediaUrl = (content: any): string | null =>
  content?.href ||
  content?.hdUrl ||
  content?.thumbUrl ||
  content?.thumb ||
  null;

/** Lấy MIME type từ msgType */
function getMimeType(msgType: string, content: any): string | null {
  if (msgType?.includes("photo") || msgType === "webchat") return "image/png";
  if (msgType?.includes("video")) return "video/mp4";
  if (msgType?.includes("voice")) return "audio/aac";
  if (msgType?.includes("sticker")) return "image/png";
  if (msgType?.includes("file")) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const ext = params?.fileExt?.toLowerCase()?.replace(".", "") || "";
    const mimeType = CONFIG.mimeTypes[ext];
    return mimeType && isSupportedMime(mimeType) ? mimeType : null;
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
 * Tải lịch sử tin nhắn phân trang an toàn (Pagination với Anti-Ban)
 * Giống hành vi con người: kéo lên xem tin cũ -> dừng đọc -> kéo tiếp
 *
 * @param api Đối tượng API Zalo
 * @param type Loại trò chuyện (0 = User, 1 = Group)
 * @param limit Tổng số lượng tin nhắn muốn lấy tối đa
 */
export async function fetchFullHistory(
  api: any,
  type: number,
  limit?: number
): Promise<any[]> {
  const config = getPaginationConfig();
  const targetLimit = limit ?? config.defaultLimit;

  let allMessages: any[] = [];
  let lastMsgId: string | null = null; // null = bắt đầu từ tin mới nhất
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

    // 1. Tạo Promise để chờ sự kiện trả về từ Zalo
    const batchMessages = await new Promise<any[]>((resolve) => {
      // Handler khi có dữ liệu về
      const handler = (msgs: any[], msgType: number) => {
        if (msgType !== type) return; // Bỏ qua nếu sai loại

        // Hủy đăng ký ngay để không bị trùng lặp ở vòng lặp sau
        api.listener.off("old_messages", handler);
        resolve(msgs);
      };

      // Đăng ký lắng nghe
      api.listener.on("old_messages", handler);

      // Gửi yêu cầu lấy tin (Scroll lên)
      // lastMsgId là ID của tin nhắn CŨ NHẤT hiện tại -> Zalo sẽ lấy các tin cũ hơn nó
      api.listener.requestOldMessages(type, lastMsgId);

      // Timeout an toàn: Nếu 10s Zalo không trả lời thì coi như hết tin hoặc lỗi
      setTimeout(() => {
        api.listener.off("old_messages", handler);
        resolve([]);
      }, config.pageTimeout);
    });

    // 2. Xử lý dữ liệu nhận được
    if (batchMessages.length === 0) {
      console.log("[History] ⚠️ Không còn tin nhắn cũ hơn hoặc bị timeout.");
      debugLog("HISTORY", `Page ${pageCount}: No more messages or timeout`);
      hasMore = false;
      break;
    }

    // 3. Sắp xếp tin nhắn trong batch này (để tìm ra tin cũ nhất)
    batchMessages.sort(
      (a, b) => parseInt(b.data.msgId) - parseInt(a.data.msgId)
    ); // Mới nhất -> Cũ nhất

    // Thêm vào danh sách tổng
    allMessages = [...allMessages, ...batchMessages];

    // Cập nhật con trỏ lastMsgId = tin nhắn cũ nhất trong đám vừa lấy
    const oldestMessageInBatch = batchMessages[batchMessages.length - 1];
    lastMsgId = oldestMessageInBatch.data.msgId;

    console.log(
      `[History]    + Trang ${pageCount}: Lấy được ${batchMessages.length} tin. (Tổng: ${allMessages.length})`
    );
    debugLog(
      "HISTORY",
      `Page ${pageCount}: ${batchMessages.length} messages, total=${allMessages.length}, lastMsgId=${lastMsgId}`
    );

    // 4. Kiểm tra điều kiện dừng
    if (allMessages.length >= targetLimit) break;

    // 5. DELAY QUAN TRỌNG (Anti-Ban)
    // Nghỉ ngẫu nhiên từ 2s đến 5s giữa các lần kéo
    const waitTime = randomDelay(config.minDelay, config.maxDelay);
    console.log(
      `[History]    💤 Nghỉ ${(waitTime / 1000).toFixed(
        1
      )}s cho đỡ bị nghi là Bot...`
    );
    debugLog("HISTORY", `Sleeping ${waitTime}ms before next page`);
    await sleep(waitTime);
  }

  // Sắp xếp lại toàn bộ theo thời gian (Cũ -> Mới) để AI đọc hiểu
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
 * Preload tất cả tin nhắn cũ từ Zalo khi bot start
 * Sử dụng pagination với delay anti-ban
 */
export async function preloadAllHistory(api: any): Promise<void> {
  if (isPreloaded) {
    debugLog("HISTORY", "Already preloaded, skipping");
    return;
  }

  // Kiểm tra config enabled
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

    // Load User messages nếu được bật
    if (CONFIG.historyLoader.loadUser) {
      const userMessages = await fetchFullHistory(api, 0);

      // Lọc chỉ giữ tin nhắn từ allowedUserIds (nếu có config)
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

      // Delay trước khi load Group messages (nếu cần)
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

    // Load Group messages nếu được bật
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
    logError("preloadAllHistory", error);
    console.log("[History] ⚠️ Preload gặp lỗi, tiếp tục với dữ liệu hiện có");
    isPreloaded = true;
  }
}

/**
 * Lấy lịch sử chat cũ từ cache hoặc Zalo API
 */
export async function loadOldMessages(
  api: any,
  threadId: string,
  type: number
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

  // Fallback: request từ Zalo API (có thể không có kết quả)
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

/** Lấy history dạng Gemini Content[] */
export const getHistory = (threadId: string): Content[] =>
  messageHistory.get(threadId) || [];

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

/** Lấy raw Zalo messages (cho quote feature) */
export const getRawHistory = (threadId: string): any[] =>
  rawMessageHistory.get(threadId) || [];

/** Kiểm tra thread đã được khởi tạo chưa */
export const isThreadInitialized = (threadId: string): boolean =>
  initializedThreads.has(threadId);
