import { Zalo, API, Credentials } from "zca-js";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config/env.js";
import { logger } from "../utils/logger.js";

const CREDENTIALS_PATH = "./credentials.json";

// Khởi tạo Zalo instance
export const zalo = new Zalo({
  selfListen: CONFIG.SELF_LISTEN,
  logging: true,
});

// Lưu credentials vào file
export function saveCredentials(api: API): void {
  try {
    const context = api.getContext();
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(context, null, 2));
    logger.success("Đã lưu credentials vào file");
  } catch (error) {
    logger.error("Lỗi lưu credentials:", error);
  }
}

// Đọc credentials từ file
export function loadCredentials(): Credentials | null {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const data = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      logger.info("Đã tìm thấy credentials đã lưu");
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error("Lỗi đọc credentials:", error);
  }
  return null;
}

// Login với credentials đã lưu hoặc QR code
export async function loginZalo(): Promise<API> {
  const savedCredentials = loadCredentials();

  if (savedCredentials) {
    try {
      logger.info("Đang đăng nhập bằng credentials đã lưu...");
      const api = await zalo.login(savedCredentials);
      logger.success("Đăng nhập thành công bằng credentials!");
      return api;
    } catch (error) {
      logger.warn("Credentials hết hạn, chuyển sang đăng nhập QR...");
    }
  }

  // Login bằng QR Code
  logger.info("Đang tạo mã QR...");
  const api = await zalo.loginQR({ qrPath: "./qr.png" }, (info) => {
    logger.info("Vui lòng quét mã QR tại file ./qr.png");
  });

  // Lưu credentials sau khi đăng nhập thành công
  saveCredentials(api);

  return api;
}
