/**
 * Message Buffer - Cơ chế đệm tin nhắn để gom nhiều tin thành 1 context
 */
import { ThreadType } from "../infrastructure/zalo/zalo.service.js";
import { handleMixedContent } from "../modules/gateway/gateway.module.js";
import { startTask } from "../shared/utils/taskManager.js";
import { debugLog, logStep, logError } from "../core/logger/logger.js";

// Queue tin nhắn theo thread
const messageQueues = new Map<string, any[]>();
const processingThreads = new Set<string>();

// Buffer config
const BUFFER_DELAY_MS = 2500; // Chờ 2.5s để user nhắn hết câu
const TYPING_REFRESH_MS = 3000; // Refresh typing mỗi 3s

// Buffer storage
interface ThreadBuffer {
  timer: NodeJS.Timeout | null;
  messages: any[];
  isTyping: boolean;
  typingInterval: NodeJS.Timeout | null;
}
const threadBuffers = new Map<string, ThreadBuffer>();

/**
 * Xử lý queue của một thread
 */
async function processQueue(api: any, threadId: string, signal?: AbortSignal) {
  if (processingThreads.has(threadId)) {
    debugLog("QUEUE", `Thread ${threadId} already processing, skipping`);
    return;
  }

  const queue = messageQueues.get(threadId);
  if (!queue || queue.length === 0) {
    debugLog("QUEUE", `Thread ${threadId} queue empty`);
    return;
  }

  processingThreads.add(threadId);
  debugLog(
    "QUEUE",
    `Processing queue for thread ${threadId}: ${queue.length} messages`
  );
  logStep("processQueue:start", { threadId, queueLength: queue.length });

  while (queue.length > 0) {
    if (signal?.aborted) {
      debugLog("QUEUE", `Queue processing aborted for thread ${threadId}`);
      processingThreads.delete(threadId);
      return;
    }

    const allMessages = [...queue];
    queue.length = 0;

    debugLog("QUEUE", `Processing ${allMessages.length} messages`);
    logStep("processQueue:messages", { count: allMessages.length });

    if (allMessages.length === 0) {
      debugLog("QUEUE", "No processable messages");
      continue;
    }

    if (signal?.aborted) {
      debugLog("QUEUE", `Aborted before processing messages`);
      break;
    }

    debugLog(
      "QUEUE",
      `Using handleMixedContent for ${allMessages.length} messages`
    );
    await handleMixedContent(api, allMessages, threadId, signal);
  }

  processingThreads.delete(threadId);
  debugLog("QUEUE", `Finished processing queue for thread ${threadId}`);
  logStep("processQueue:end", { threadId });
}

/**
 * Bắt đầu typing với auto-refresh
 */
export function startTypingWithRefresh(api: any, threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer) return;

  api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
  buffer.isTyping = true;

  if (buffer.typingInterval) {
    clearInterval(buffer.typingInterval);
  }

  buffer.typingInterval = setInterval(() => {
    if (buffer.isTyping) {
      api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
      debugLog("TYPING", `Refreshed typing for ${threadId}`);
    }
  }, TYPING_REFRESH_MS);

  debugLog("BUFFER", `Started typing with refresh for ${threadId}`);
}

/**
 * Dừng typing và clear interval
 */
export function stopTyping(threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer) return;

  buffer.isTyping = false;
  if (buffer.typingInterval) {
    clearInterval(buffer.typingInterval);
    buffer.typingInterval = null;
  }
  debugLog("BUFFER", `Stopped typing for ${threadId}`);
}

/**
 * Xử lý buffer khi timeout
 */
async function processBufferedMessages(api: any, threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer || buffer.messages.length === 0) {
    if (buffer?.isTyping) {
      stopTyping(threadId);
    }
    return;
  }

  const messagesToProcess = [...buffer.messages];
  buffer.messages = [];
  buffer.timer = null;

  debugLog(
    "BUFFER",
    `Processing batch of ${messagesToProcess.length} messages for ${threadId}`
  );
  logStep("buffer:process", {
    threadId,
    messageCount: messagesToProcess.length,
  });

  const abortSignal = startTask(threadId);

  if (!messageQueues.has(threadId)) {
    messageQueues.set(threadId, []);
  }
  const queue = messageQueues.get(threadId)!;
  messagesToProcess.forEach((msg) => queue.push(msg));

  try {
    await processQueue(api, threadId, abortSignal);
  } catch (e: any) {
    if (e.message === "Aborted" || abortSignal.aborted) {
      debugLog("BUFFER", `Task aborted for thread ${threadId}`);
      return;
    }
    logError("processBufferedMessages", e);
    console.error("[Bot] Lỗi xử lý buffer:", e);
    processingThreads.delete(threadId);
  } finally {
    stopTyping(threadId);
  }
}

/**
 * Thêm tin nhắn vào buffer
 */
export function addToBuffer(api: any, threadId: string, message: any) {
  // Lấy hoặc tạo buffer
  if (!threadBuffers.has(threadId)) {
    threadBuffers.set(threadId, {
      timer: null,
      messages: [],
      isTyping: false,
      typingInterval: null,
    });
  }
  const buffer = threadBuffers.get(threadId)!;

  // Thêm tin nhắn
  buffer.messages.push(message);
  debugLog(
    "BUFFER",
    `Added to buffer: thread=${threadId}, bufferSize=${buffer.messages.length}`
  );

  // Hiển thị typing
  if (!buffer.isTyping) {
    startTypingWithRefresh(api, threadId);
  }

  // Reset timer (Debounce)
  if (buffer.timer) {
    clearTimeout(buffer.timer);
    debugLog("BUFFER", `Debounced: User still typing... (${threadId})`);
  }

  // Đặt timer mới
  buffer.timer = setTimeout(() => {
    processBufferedMessages(api, threadId);
  }, BUFFER_DELAY_MS);
}

/**
 * Lấy buffer config
 */
export function getBufferConfig() {
  return { BUFFER_DELAY_MS, TYPING_REFRESH_MS };
}
