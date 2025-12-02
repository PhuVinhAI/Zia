import * as zcajs from "zca-js";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config/index.js";

export const { Zalo, ThreadType, Reactions, TextStyle } = zcajs as any;

const CREDENTIALS_PATH = "./credentials.json";

export const zalo = new Zalo({
  selfListen: CONFIG.selfListen,
  logging: CONFIG.logging,
});

/**
 * Lưu credentials sau khi đăng nhập thành công
 */
function saveCredentials(api: any): void {
  try {
    const ctx = api.getContext();
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(ctx, null, 2));
    console.log(`💾 Đã lưu phiên đăng nhập vào ${CREDENTIALS_PATH}`);
  } catch (e) {
    console.error("⚠️ Không thể lưu credentials:", e);
  }
}

/**
 * Load credentials đã lưu
 */
function loadCredentials(): any | null {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const data = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("⚠️ Không thể đọc credentials:", e);
  }
  return null;
}

/**
 * Đăng nhập với credentials đã lưu hoặc QR code
 */
export async function loginWithQR(qrPath: string = "./qr.png") {
  console.log("🚀 Đang khởi động Bot...");

  let api: any;

  // Thử đăng nhập bằng credentials đã lưu
  const savedCredentials = loadCredentials();
  if (savedCredentials) {
    console.log("🔑 Tìm thấy phiên đăng nhập cũ, đang kết nối lại...");
    try {
      api = await zalo.login(savedCredentials);
      console.log("✅ Kết nối lại thành công!");
    } catch (e) {
      console.log("⚠️ Phiên cũ hết hạn, cần quét QR mới...");
      // Xóa credentials cũ
      if (fs.existsSync(CREDENTIALS_PATH)) {
        fs.unlinkSync(CREDENTIALS_PATH);
      }
      api = await zalo.loginQR({ qrPath });
      saveCredentials(api);
    }
  } else {
    // Đăng nhập bằng QR
    console.log("📱 Quét mã QR để đăng nhập...");
    api = await zalo.loginQR({ qrPath });
    saveCredentials(api);
  }

  const myId = api.getContext().uid;
  const userName = api.getContext()?.loginInfo?.name || "Unknown";

  console.log(`✅ Đăng nhập thành công!`);
  console.log(`👤 Tên: ${userName}`);
  console.log(`🆔 ID: ${myId}`);

  return { api, myId };
}
