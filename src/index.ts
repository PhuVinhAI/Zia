import "./env.js";
import { loginWithQR } from "./services/zalo.js";
import { CONFIG } from "./config/index.js";
import { checkRateLimit, isAllowedUser } from "./utils/index.js";
import {
  handleSticker,
  handleImage,
  handleVideo,
  handleVoice,
  handleFile,
  handleText,
} from "./handlers/index.js";

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

  const { api, myId } = await loginWithQR();

  api.listener.on("message", async (message: any) => {
    const content = message.data?.content;
    const threadId = message.threadId;
    const msgType = message.data?.msgType;
    const isSelf = message.isSelf;

    // Bỏ qua tin nhắn của chính bot
    if (isSelf) return;

    // Lọc theo tên người gửi
    const senderName = message.data?.dName || "";
    if (!isAllowedUser(senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}"`);
      return;
    }

    // Kiểm tra rate limit
    if (!checkRateLimit(threadId)) return;

    // Xử lý theo loại tin nhắn
    try {
      if (msgType === "chat.sticker" && content?.id) {
        await handleSticker(api, message, threadId);
        return;
      }

      if (msgType === "share.file" && content?.href) {
        await handleFile(api, message, threadId);
        return;
      }

      if (
        msgType === "chat.photo" ||
        (msgType === "webchat" && content?.href)
      ) {
        await handleImage(api, message, threadId);
        return;
      }

      if (msgType === "chat.video.msg" && content?.thumb) {
        await handleVideo(api, message, threadId);
        return;
      }

      if (msgType === "chat.voice" && content?.href) {
        await handleVoice(api, message, threadId);
        return;
      }

      // Tin nhắn text
      if (typeof content === "string") {
        await handleText(api, message, threadId);
        return;
      }

      // Debug các loại tin nhắn khác
      console.log(
        `[DEBUG] msgType: ${msgType}, content:`,
        JSON.stringify(content, null, 2)
      );
    } catch (e) {
      console.error("[Bot] Lỗi xử lý tin nhắn:", e);
    }
  });

  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});
