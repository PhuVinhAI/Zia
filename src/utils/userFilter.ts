import { CONFIG, reloadSettings } from "../config/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, "../config/settings.json");

export function isAllowedUser(senderName: string): boolean {
  // Nếu danh sách rỗng, cho phép tất cả
  if (!CONFIG.allowedUsers || CONFIG.allowedUsers.length === 0) {
    return true;
  }

  // Kiểm tra tên có trong danh sách không
  return CONFIG.allowedUsers.some((name) => senderName.includes(name));
}

export function addAllowedUser(name: string): boolean {
  if (CONFIG.allowedUsers.includes(name)) {
    return false;
  }

  CONFIG.allowedUsers.push(name);
  saveSettings();
  return true;
}

export function removeAllowedUser(name: string): boolean {
  const index = CONFIG.allowedUsers.indexOf(name);
  if (index === -1) {
    return false;
  }

  CONFIG.allowedUsers.splice(index, 1);
  saveSettings();
  return true;
}

export function getAllowedUsers(): string[] {
  return CONFIG.allowedUsers;
}

function saveSettings() {
  const data = fs.readFileSync(settingsPath, "utf-8");
  const settings = JSON.parse(data);
  settings.allowedUsers = CONFIG.allowedUsers;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log("[Config] ✅ Đã lưu danh sách người dùng");
}
