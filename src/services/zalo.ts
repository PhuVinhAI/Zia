import * as zcajs from "zca-js";
import { CONFIG } from "../config/index.js";

export const { Zalo, ThreadType, Reactions } = zcajs as any;

export const zalo = new Zalo({
  selfListen: CONFIG.selfListen,
  logging: CONFIG.logging,
});

export async function loginWithQR(qrPath: string = "./qr.png") {
  console.log("🚀 Đang khởi động Bot...");
  const api = await zalo.loginQR({ qrPath });
  const myId = api.getContext().uid;
  const userName = api.getContext()?.loginInfo?.name || "Unknown";

  console.log(`✅ Đăng nhập thành công!`);
  console.log(`👤 Tên: ${userName}`);
  console.log(`🆔 ID: ${myId}`);

  return { api, myId };
}
