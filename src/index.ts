import "./env.js";
import { loginWithQR, ThreadType } from "./services/zalo.js";
import { CONFIG } from "./config/index.js";
import { checkRateLimit, isAllowedUser } from "./utils/index.js";
import { initThreadHistory, isThreadInitialized } from "./utils/history.js";
import {
  initFileLogger,
  enableFileLogging,
  logMessage,
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
} from "./handlers/index.js";
import { setupSelfMessageListener } from "./handlers/streamResponse.js";

// Khởi tạo file logging nếu bật
if (CONFIG.fileLogging) {
  initFileLogger(CONFIG.logFile);
  enableFileLogging();
}

// Queue tin nhắn theo thread để xử lý tuần tự
const messageQueues = new Map<string, any[]>();
const processingThreads = new Set<string>();

// Xử lý một tin nhắn
async function processMessage(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const msgType = message.data?.msgType;

  if (msgType === "chat.sticker" && content?.id) {
    await handleSticker(api, message, threadId);
  } else if (msgType === "share.file" && content?.href) {
    await handleFile(api, message, threadId);
  } else if (
    msgType === "chat.photo" ||
    (msgType === "webchat" && content?.href)
  ) {
    await handleImage(api, message, threadId);
  } else if (msgType === "chat.video.msg" && content?.thumb) {
    await handleVideo(api, message, threadId);
  } else if (msgType === "chat.voice" && content?.href) {
    await handleVoice(api, message, threadId);
  } else if (typeof content === "string") {
    // Sử dụng streaming handler nếu bật
    if (CONFIG.useStreaming) {
      await handleTextStream(api, message, threadId);
    } else {
      await handleText(api, message, threadId);
    }
  } else {
    console.log(
      `[DEBUG] msgType: ${msgType}, content:`,
      JSON.stringify(content, null, 2)
    );
  }
}

// Helper: Phân loại tin nhắn
function classifyMessage(msg: any): "text" | "image" | "video" | "other" {
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || "";

  if (typeof content === "string" && !msgType.includes("sticker")) {
    return "text";
  }
  if (msgType === "chat.photo" || (msgType === "webchat" && content?.href)) {
    return "image";
  }
  if (msgType === "chat.video.msg") {
    return "video";
  }
  return "other";
}

// Xử lý queue của một thread
async function processQueue(api: any, threadId: string) {
  if (processingThreads.has(threadId)) return;

  const queue = messageQueues.get(threadId);
  if (!queue || queue.length === 0) return;

  processingThreads.add(threadId);

  while (queue.length > 0) {
    // Phân loại tin nhắn
    const textMessages: any[] = [];
    const imageMessages: any[] = [];
    const otherMessages: any[] = [];

    for (const msg of queue) {
      const type = classifyMessage(msg);
      if (type === "text") {
        textMessages.push(msg);
      } else if (type === "image") {
        imageMessages.push(msg);
      } else {
        otherMessages.push(msg);
      }
    }

    // Clear queue
    queue.length = 0;

    // Lấy caption từ text messages (nếu có ảnh)
    let caption = "";
    if (imageMessages.length > 0 && textMessages.length > 0) {
      caption = textMessages.map((m) => m.data.content).join("\n");
      console.log(`[Bot] 📝 Dùng text làm caption cho ảnh: "${caption}"`);
      textMessages.length = 0; // Clear text vì đã dùng làm caption
    }

    // Xử lý nhiều ảnh cùng lúc
    if (imageMessages.length > 1) {
      console.log(`[Bot] 📦 Gộp ${imageMessages.length} ảnh`);
      await handleMultipleImages(
        api,
        imageMessages,
        threadId,
        caption || undefined
      );
    } else if (imageMessages.length === 1) {
      // 1 ảnh + caption
      if (caption) {
        const msg = imageMessages[0];
        msg.data.content = { ...msg.data.content, title: caption };
      }
      await processMessage(api, imageMessages[0], threadId);
    }

    // Xử lý tin nhắn text gộp (nếu còn)
    if (textMessages.length > 0) {
      if (textMessages.length === 1) {
        await processMessage(api, textMessages[0], threadId);
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
        await processMessage(api, combinedMessage, threadId);
      }
    }

    // Xử lý các tin nhắn khác (video, voice, file, sticker...)
    for (const msg of otherMessages) {
      await processMessage(api, msg, threadId);
    }
  }

  processingThreads.delete(threadId);
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
    `👥 Allowed users: ${
      CONFIG.allowedUsers.length > 0 ? CONFIG.allowedUsers.join(", ") : "Tất cả"
    }`
  );
  console.log("─".repeat(50));

  const { api } = await loginWithQR();

  // Setup listener để bắt tin nhắn của chính mình (cho tính năng thu hồi)
  setupSelfMessageListener(api);

  api.listener.on("message", async (message: any) => {
    const threadId = message.threadId;
    const isSelf = message.isSelf;

    // Log tin nhắn đến (chi tiết trong file log)
    if (CONFIG.fileLogging) {
      logMessage("IN", threadId, {
        msgType: message.data?.msgType,
        content: message.data?.content,
        sender: message.data?.dName,
        isSelf,
      });
    }

    if (isSelf) return;

    // Chặn tin nhắn từ nhóm - chỉ xử lý tin nhắn cá nhân
    if (message.type === ThreadType.Group) {
      console.log(`[Bot] 🚫 Bỏ qua tin nhắn nhóm: ${threadId}`);
      return;
    }

    const senderName = message.data?.dName || "";
    if (!isAllowedUser(senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}"`);
      return;
    }

    if (!checkRateLimit(threadId)) return;

    // Khởi tạo history từ Zalo nếu chưa có
    const msgType = message.type; // 0 = user, 1 = group
    if (!isThreadInitialized(threadId)) {
      await initThreadHistory(api, threadId, msgType);
    }

    // Thêm vào queue
    if (!messageQueues.has(threadId)) {
      messageQueues.set(threadId, []);
    }
    messageQueues.get(threadId)!.push(message);

    // Xử lý queue (nếu chưa đang xử lý)
    try {
      await processQueue(api, threadId);
    } catch (e) {
      console.error("[Bot] Lỗi xử lý tin nhắn:", e);
      processingThreads.delete(threadId);
    }
  });

  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});
