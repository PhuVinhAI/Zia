import { loginZalo } from "./core/zalo.js";
import { onIncomingMessage } from "./handlers/message.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.info(">>> Đang khởi động Zalo AI Bot...");

  try {
    // Login Zalo (tự động dùng credentials đã lưu hoặc QR)
    const api = await loginZalo();

    const userName = api.getContext()?.loginInfo?.name || "Unknown";
    logger.success(`>>> Đăng nhập thành công! Tên: ${userName}`);

    // Lắng nghe sự kiện tin nhắn
    api.listener.on("message", (message) => onIncomingMessage(api, message));

    // Bắt đầu socket
    api.listener.start();
    logger.success(">>> Bot đang chạy và lắng nghe tin nhắn...");

    // Graceful shutdown
    process.on("SIGINT", () => {
      logger.info("Đang tắt bot...");
      api.listener.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("Đang tắt bot...");
      api.listener.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Lỗi khởi động bot:", error);
    process.exit(1);
  }
}

main();
