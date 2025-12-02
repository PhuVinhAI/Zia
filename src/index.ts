import "./env.js";
import { loginWithQR, ThreadType } from "./services/zalo.js";
import { CONFIG } from "./config/index.js";
import { isAllowedUser } from "./utils/userFilter.js";
import { initThreadHistory, isThreadInitialized } from "./utils/history.js";
import {
  initFileLogger,
  enableFileLogging,
  logMessage,
  debugLog,
  logStep,
  logError,
  getCurrentLogFile,
} from "./utils/logger.js";
import {
  handleMixedContent,
  setupSelfMessageListener,
} from "./handlers/index.js";
import { startTask, abortTask } from "./utils/taskManager.js";

// Khởi tạo file logging nếu bật - mỗi lần chạy tạo file mới
if (CONFIG.fileLogging) {
  initFileLogger(CONFIG.logFile);
  enableFileLogging();
  debugLog(
    "INIT",
    `Config loaded: ${JSON.stringify({
      name: CONFIG.name,
      prefix: CONFIG.prefix,
      requirePrefix: CONFIG.requirePrefix,
      rateLimitMs: CONFIG.rateLimitMs,
      useStreaming: CONFIG.useStreaming,
      selfListen: CONFIG.selfListen,
      allowedUserIds: CONFIG.allowedUserIds,
    })}`
  );
}

// Queue tin nhắn theo thread để xử lý tuần tự
const messageQueues = new Map<string, any[]>();
const processingThreads = new Set<string>();

// ========== BUFFERING ==========
// Cơ chế đệm tin nhắn để gom nhiều tin thành 1 context trước khi xử lý
interface ThreadBuffer {
  timer: NodeJS.Timeout | null;
  messages: any[];
  isTyping: boolean; // Bot đang typing
  typingInterval: NodeJS.Timeout | null; // Interval để refresh typing
}
const threadBuffers = new Map<string, ThreadBuffer>();
const BUFFER_DELAY_MS = 2500; // Chờ 2.5s để user nhắn hết câu
const TYPING_REFRESH_MS = 3000; // Refresh typing mỗi 3s (Zalo tự tắt sau ~5s)

// Xử lý queue của một thread - LUÔN dùng handleMixedContent
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
    // Kiểm tra abort signal
    if (signal?.aborted) {
      debugLog("QUEUE", `Queue processing aborted for thread ${threadId}`);
      processingThreads.delete(threadId);
      return;
    }

    // Lấy tất cả tin nhắn từ queue
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

    // LUÔN dùng handleMixedContent cho mọi loại tin nhắn
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

// Helper: Bắt đầu typing với auto-refresh
function startTypingWithRefresh(api: any, threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer) return;

  // Gửi typing ngay
  api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
  buffer.isTyping = true;

  // Clear interval cũ nếu có
  if (buffer.typingInterval) {
    clearInterval(buffer.typingInterval);
  }

  // Tạo interval để refresh typing mỗi 3s
  buffer.typingInterval = setInterval(() => {
    if (buffer.isTyping) {
      api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
      debugLog("TYPING", `Refreshed typing for ${threadId}`);
    }
  }, TYPING_REFRESH_MS);

  debugLog("BUFFER", `Started typing with refresh for ${threadId}`);
}

// Helper: Dừng typing và clear interval
function stopTyping(threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer) return;

  buffer.isTyping = false;
  if (buffer.typingInterval) {
    clearInterval(buffer.typingInterval);
    buffer.typingInterval = null;
  }
  debugLog("BUFFER", `Stopped typing for ${threadId}`);
}

// ========== XỬ LÝ BUFFER ==========
// Khi buffer timeout, gom tất cả tin nhắn và đưa vào queue xử lý
async function processBufferedMessages(api: any, threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer || buffer.messages.length === 0) {
    // Không có tin nhắn, tắt typing nếu đang bật
    if (buffer?.isTyping) {
      stopTyping(threadId);
    }
    return;
  }

  // Lấy tin nhắn và clear buffer ngay để đón tin mới
  const messagesToProcess = [...buffer.messages];
  buffer.messages = [];
  buffer.timer = null;
  // Giữ isTyping = true trong khi xử lý, sẽ tắt sau khi xong

  debugLog(
    "BUFFER",
    `Processing batch of ${messagesToProcess.length} messages for ${threadId}`
  );
  logStep("buffer:process", {
    threadId,
    messageCount: messagesToProcess.length,
  });

  // 🛑 TẠO ABORT SIGNAL: Nếu bot đang trả lời dở task cũ, nó sẽ bị Kill ngay
  const abortSignal = startTask(threadId);

  // Đưa vào queue
  if (!messageQueues.has(threadId)) {
    messageQueues.set(threadId, []);
  }
  const queue = messageQueues.get(threadId)!;
  messagesToProcess.forEach((msg) => queue.push(msg));

  try {
    await processQueue(api, threadId, abortSignal);
  } catch (e: any) {
    // Bỏ qua lỗi do abort
    if (e.message === "Aborted" || abortSignal.aborted) {
      debugLog("BUFFER", `Task aborted for thread ${threadId}`);
      return;
    }
    logError("processBufferedMessages", e);
    console.error("[Bot] Lỗi xử lý buffer:", e);
    processingThreads.delete(threadId);
  } finally {
    // Tắt typing indicator sau khi xử lý xong (dù thành công hay lỗi)
    stopTyping(threadId);
  }
}

async function main() {
  console.log("─".repeat(50));
  console.log(`🤖 ${CONFIG.name}`);
  console.log(
    `📌 Prefix: "${CONFIG.prefix}" (${
      CONFIG.requirePrefix ? "bắt buộc" : "tùy chọn"
    })`
  );
  console.log(`⏱️ Rate limit: ${CONFIG.rateLimitMs}ms`);
  console.log(
    `👥 Allowed user IDs: ${
      CONFIG.allowedUserIds.length > 0
        ? CONFIG.allowedUserIds.join(", ")
        : "Tất cả"
    }`
  );
  console.log(`📝 Streaming: ${CONFIG.useStreaming ? "ON" : "OFF"}`);
  if (CONFIG.fileLogging) {
    console.log(`📄 Log file: ${getCurrentLogFile()}`);
  }
  console.log("─".repeat(50));

  logStep("main:start", { config: CONFIG.name });

  const { api } = await loginWithQR();
  logStep("main:loginComplete", "Zalo login successful");

  // Setup listener để bắt tin nhắn của chính mình (cho tính năng thu hồi)
  setupSelfMessageListener(api);
  debugLog("INIT", "Self message listener setup complete");

  api.listener.on("message", async (message: any) => {
    const threadId = message.threadId;
    const isSelf = message.isSelf;

    // Log RAW message từ Zalo (đầy đủ để debug)
    if (CONFIG.fileLogging) {
      logMessage("IN", threadId, message); // Log toàn bộ raw message
    }

    if (isSelf) {
      debugLog("MSG", `Skipping self message: thread=${threadId}`);
      return;
    }

    // Chặn tin nhắn từ nhóm - chỉ xử lý tin nhắn cá nhân
    if (message.type === ThreadType.Group) {
      console.log(`[Bot] 🚫 Bỏ qua tin nhắn nhóm: ${threadId}`);
      debugLog("MSG", `Skipping group message: thread=${threadId}`);
      return;
    }

    const senderId = message.data?.uidFrom || threadId;
    const senderName = message.data?.dName || "";
    if (!isAllowedUser(senderId, senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}" (${senderId})`);
      return;
    }

    // Khởi tạo history từ Zalo nếu chưa có
    const msgType = message.type; // 0 = user, 1 = group
    if (!isThreadInitialized(threadId)) {
      debugLog("MSG", `Initializing history for thread: ${threadId}`);
      await initThreadHistory(api, threadId, msgType);
    }

    // ========== HUMAN-LIKE BUFFERING ==========
    // Thay vì xử lý ngay, đưa vào buffer và chờ user nhắn hết

    // 1. Lấy hoặc tạo buffer cho thread
    if (!threadBuffers.has(threadId)) {
      threadBuffers.set(threadId, {
        timer: null,
        messages: [],
        isTyping: false,
        typingInterval: null,
      });
    }
    const buffer = threadBuffers.get(threadId)!;

    // 2. Thêm tin nhắn vào buffer
    buffer.messages.push(message);
    debugLog(
      "BUFFER",
      `Added to buffer: thread=${threadId}, bufferSize=${buffer.messages.length}`
    );

    // 3. Hủy task đang chạy nếu có (bot đang trả lời thì dừng lại)
    abortTask(threadId);

    // 4. Hiển thị "Đang soạn tin..." với auto-refresh
    if (!buffer.isTyping) {
      startTypingWithRefresh(api, threadId);
    }

    // 6. Reset timer (Debounce) - nếu user nhắn tiếp trong 2.5s, chờ tiếp
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      debugLog("BUFFER", `Debounced: User still typing... (${threadId})`);
    }

    // 7. Đặt timer mới - sau 2.5s không có tin mới thì xử lý
    buffer.timer = setTimeout(() => {
      processBufferedMessages(api, threadId);
    }, BUFFER_DELAY_MS);
  });

  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
  logStep("main:listening", "Bot is now listening for messages");
}

main().catch((err) => {
  logError("main", err);
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});
