/**
 * Zalo AI Bot - Entry Point
 */
import "../shared/constants/env.js";
import { ThreadType } from "../infrastructure/zalo/zalo.service.js";
import { CONFIG } from "../shared/constants/config.js";
import { isAllowedUser } from "../modules/gateway/user.filter.js";
import {
  initThreadHistory,
  isThreadInitialized,
} from "../shared/utils/history.js";
import {
  logMessage,
  debugLog,
  logStep,
  logError,
} from "../core/logger/logger.js";
import { abortTask } from "../shared/utils/taskManager.js";

// Import từ các module mới
import {
  initLogging,
  printStartupInfo,
  loginZalo,
  setupListeners,
  isCloudMessage,
  processCloudMessage,
  shouldSkipMessage,
} from "./botSetup.js";
import { addToBuffer } from "./messageBuffer.js";

// Khởi tạo logging
initLogging();

async function main() {
  printStartupInfo();

  // Đăng nhập Zalo
  const { api, myId } = await loginZalo();

  // Setup listeners và preload history
  await setupListeners(api);

  // Message handler
  api.listener.on("message", async (message: any) => {
    const threadId = message.threadId;
    const isSelf = message.isSelf;

    // Log RAW message
    if (CONFIG.fileLogging) {
      logMessage("IN", threadId, message);
    }

    // Kiểm tra Cloud Debug
    const cloudMessage = isCloudMessage(message);
    if (cloudMessage) {
      processCloudMessage(message);
    }

    // Kiểm tra bỏ qua
    const { skip, reason } = shouldSkipMessage(message);
    if (skip && !cloudMessage) {
      if (reason === "group message") {
        console.log(`[Bot] 🚫 Bỏ qua tin nhắn nhóm: ${threadId}`);
      }
      debugLog("MSG", `Skipping: ${reason}, thread=${threadId}`);
      return;
    }

    // Kiểm tra user được phép
    const senderId = message.data?.uidFrom || threadId;
    const senderName = message.data?.dName || "";

    if (!cloudMessage && !isAllowedUser(senderId, senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}" (${senderId})`);
      return;
    }

    // Khởi tạo history
    const msgType = message.type;
    if (!isThreadInitialized(threadId)) {
      debugLog("MSG", `Initializing history for thread: ${threadId}`);
      await initThreadHistory(api, threadId, msgType);
    }

    // Hủy task đang chạy nếu có
    abortTask(threadId);

    // Thêm vào buffer
    addToBuffer(api, threadId, message);
  });

  console.log("👂 Bot đang lắng nghe...");
  logStep("main:listening", "Bot is now listening for messages");
}

main().catch((err) => {
  logError("main", err);
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});
