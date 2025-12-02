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
  handleSticker,
  handleImage,
  handleVideo,
  handleVoice,
  handleFile,
  handleText,
  handleTextStream,
  handleMultipleImages,
  handleMixedContent,
  classifyMessageDetailed,
} from "./handlers/index.js";
import { setupSelfMessageListener } from "./handlers/streamResponse.js";
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

// ========== HUMAN-LIKE BUFFERING ==========
// Cơ chế đệm tin nhắn để gom nhiều tin thành 1 context trước khi xử lý
interface ThreadBuffer {
  timer: NodeJS.Timeout | null;
  messages: any[];
  isTyping: boolean; // Bot đang typing
  userTyping: boolean; // User đang typing
  userTypingTimer: NodeJS.Timeout | null; // Timer để detect user dừng typing
}
const threadBuffers = new Map<string, ThreadBuffer>();
const BUFFER_DELAY_MS = 2500; // Chờ 2.5s để user nhắn hết câu
const USER_TYPING_TIMEOUT_MS = 3000; // Sau 3s không thấy typing event thì coi như user dừng gõ

// Xử lý một tin nhắn
async function processMessage(
  api: any,
  message: any,
  threadId: string,
  signal?: AbortSignal
) {
  const content = message.data?.content;
  const msgType = message.data?.msgType;

  debugLog(
    "PROCESS",
    `Processing message: msgType=${msgType}, thread=${threadId}`
  );
  logStep("processMessage", { msgType, threadId, contentType: typeof content });

  if (msgType === "chat.sticker" && content?.id) {
    debugLog("PROCESS", `Routing to handleSticker: stickerId=${content.id}`);
    await handleSticker(api, message, threadId);
  } else if (msgType === "share.file" && content?.href) {
    debugLog("PROCESS", `Routing to handleFile: ${content?.title}`);
    await handleFile(api, message, threadId);
  } else if (
    msgType === "chat.photo" ||
    (msgType === "webchat" && content?.href)
  ) {
    debugLog("PROCESS", `Routing to handleImage`);
    await handleImage(api, message, threadId);
  } else if (msgType === "chat.video.msg" && content?.thumb) {
    debugLog("PROCESS", `Routing to handleVideo`);
    await handleVideo(api, message, threadId);
  } else if (msgType === "chat.voice" && content?.href) {
    debugLog("PROCESS", `Routing to handleVoice`);
    await handleVoice(api, message, threadId);
  } else if (msgType === "chat.recommended") {
    // Link được Zalo preview (YouTube, website...)
    // Zalo đôi khi gửi link trong content.href, đôi khi trong params
    let url = content?.href;
    if (!url && content?.params) {
      try {
        const params = JSON.parse(content.params);
        url = params?.href;
      } catch {}
    }
    if (url) {
      debugLog("PROCESS", `Routing to handleLink: ${url}`);
      const linkMessage = {
        ...message,
        data: {
          ...message.data,
          content: url,
          msgType: "webchat",
        },
      };
      if (CONFIG.useStreaming) {
        await handleTextStream(api, linkMessage, threadId, signal);
      } else {
        await handleText(api, linkMessage, threadId);
      }
    } else {
      debugLog("PROCESS", `chat.recommended without URL`, content);
    }
  } else if (typeof content === "string") {
    // Sử dụng streaming handler nếu bật
    if (CONFIG.useStreaming) {
      debugLog(
        "PROCESS",
        `Routing to handleTextStream: "${content.substring(0, 50)}..."`
      );
      await handleTextStream(api, message, threadId, signal);
    } else {
      debugLog(
        "PROCESS",
        `Routing to handleText: "${content.substring(0, 50)}..."`
      );
      await handleText(api, message, threadId);
    }
  } else {
    console.log(
      `[DEBUG] msgType: ${msgType}, content:`,
      JSON.stringify(content, null, 2)
    );
    debugLog("PROCESS", `Unknown message type: ${msgType}`, content);
  }
}

// Helper: Kiểm tra tin nhắn có phải chỉ là text thuần không
function isTextOnly(msg: any): boolean {
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || "";
  return typeof content === "string" && !msgType.includes("sticker");
}

// Helper: Kiểm tra có media (ảnh, video, voice, file, sticker) không
function hasMedia(messages: any[]): boolean {
  return messages.some((msg) => {
    const classified = classifyMessageDetailed(msg);
    return ["image", "video", "voice", "file", "sticker"].includes(
      classified.type
    );
  });
}

// Xử lý queue của một thread
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

    // Kiểm tra có media không
    const containsMedia = hasMedia(allMessages);

    if (containsMedia) {
      // CÓ MEDIA: Gộp tất cả thành 1 request mixed content
      debugLog(
        "QUEUE",
        `Using handleMixedContent for ${allMessages.length} messages`
      );
      await handleMixedContent(api, allMessages, threadId, signal);
    } else {
      // CHỈ CÓ TEXT: Gộp text và xử lý như cũ
      const textMessages = allMessages.filter(isTextOnly);

      if (textMessages.length === 0) {
        debugLog("QUEUE", "No processable messages");
        continue;
      }

      if (signal?.aborted) {
        debugLog("QUEUE", `Aborted before processing text messages`);
        break;
      }

      if (textMessages.length === 1) {
        await processMessage(api, textMessages[0], threadId, signal);
      } else {
        // Gộp nhiều tin nhắn text thành một
        const combinedContent = textMessages
          .map((m) => m.data.content)
          .join("\n");
        const combinedMessage = {
          ...textMessages[textMessages.length - 1],
          data: {
            ...textMessages[textMessages.length - 1].data,
            content: combinedContent,
          },
          _originalMessages: textMessages,
        };
        console.log(`[Bot] 📦 Gộp ${textMessages.length} tin nhắn text`);
        debugLog(
          "QUEUE",
          `Combined ${
            textMessages.length
          } text messages: "${combinedContent.substring(0, 100)}..."`
        );
        await processMessage(api, combinedMessage, threadId, signal);
      }
    }
  }

  processingThreads.delete(threadId);
  debugLog("QUEUE", `Finished processing queue for thread ${threadId}`);
  logStep("processQueue:end", { threadId });
}

// ========== XỬ LÝ BUFFER - HUMAN-LIKE ==========
// Khi buffer timeout, gom tất cả tin nhắn và đưa vào queue xử lý
async function processBufferedMessages(api: any, threadId: string) {
  const buffer = threadBuffers.get(threadId);
  if (!buffer || buffer.messages.length === 0) return;

  // Nếu user vẫn đang typing, chờ thêm
  if (buffer.userTyping) {
    debugLog("BUFFER", `User still typing, waiting... (${threadId})`);
    // Reset timer để chờ user gõ xong
    if (buffer.timer) clearTimeout(buffer.timer);
    buffer.timer = setTimeout(() => {
      processBufferedMessages(api, threadId);
    }, BUFFER_DELAY_MS);
    return;
  }

  // Lấy tin nhắn và clear buffer ngay để đón tin mới
  const messagesToProcess = [...buffer.messages];
  buffer.messages = [];
  buffer.timer = null;
  buffer.isTyping = false;

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
        userTyping: false,
        userTypingTimer: null,
      });
    }
    const buffer = threadBuffers.get(threadId)!;

    // Reset trạng thái userTyping khi nhận được tin nhắn thực (user đã gửi xong)
    buffer.userTyping = false;
    if (buffer.userTypingTimer) {
      clearTimeout(buffer.userTypingTimer);
      buffer.userTypingTimer = null;
    }

    // 2. Thêm tin nhắn vào buffer
    buffer.messages.push(message);
    debugLog(
      "BUFFER",
      `Added to buffer: thread=${threadId}, bufferSize=${buffer.messages.length}`
    );

    // 3. Hủy task đang chạy nếu có (bot đang trả lời thì dừng lại)
    abortTask(threadId);

    // 4. Hiển thị "Đang soạn tin..." ngay khi nhận tin đầu tiên
    if (!buffer.isTyping) {
      api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
      buffer.isTyping = true;
      debugLog("BUFFER", `Started typing indicator for ${threadId}`);
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

  // ========== TYPING LISTENER - HUMAN-LIKE ==========
  // Lắng nghe khi user đang gõ để chờ họ gõ xong
  api.listener.on("typing", (event: any) => {
    // Bỏ qua nếu là chính bot đang gõ
    if (event.isSelf) return;

    // Chỉ xử lý tin nhắn cá nhân
    if (event.type === ThreadType.Group) return;

    const threadId = event.threadId;
    const senderId = event.data?.uid;

    debugLog("TYPING", `User ${senderId} is typing in thread ${threadId}`);

    // Lấy hoặc tạo buffer cho thread
    if (!threadBuffers.has(threadId)) {
      threadBuffers.set(threadId, {
        timer: null,
        messages: [],
        isTyping: false,
        userTyping: false,
        userTypingTimer: null,
      });
    }
    const buffer = threadBuffers.get(threadId)!;

    // Đánh dấu user đang typing
    buffer.userTyping = true;

    // Hủy task đang chạy nếu có (bot đang trả lời thì dừng lại vì user đang gõ)
    abortTask(threadId);

    // Reset buffer timer nếu có (chờ user gõ xong)
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
      debugLog(
        "TYPING",
        `Paused buffer timer - waiting for user to finish typing`
      );
    }

    // Reset typing timer - sau 3s không thấy typing event thì coi như user dừng gõ
    if (buffer.userTypingTimer) {
      clearTimeout(buffer.userTypingTimer);
    }
    buffer.userTypingTimer = setTimeout(() => {
      buffer.userTyping = false;
      buffer.userTypingTimer = null;
      debugLog("TYPING", `User stopped typing in thread ${threadId}`);

      // Nếu có tin nhắn trong buffer, bắt đầu đếm lại 2.5s
      if (buffer.messages.length > 0) {
        debugLog("TYPING", `Resuming buffer timer for ${threadId}`);
        buffer.timer = setTimeout(() => {
          processBufferedMessages(api, threadId);
        }, BUFFER_DELAY_MS);
      }
    }, USER_TYPING_TIMEOUT_MS);
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
