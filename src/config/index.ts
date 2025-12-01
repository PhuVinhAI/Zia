import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load settings từ JSON
function loadSettings() {
  const settingsPath = path.join(__dirname, "settings.json");
  const data = fs.readFileSync(settingsPath, "utf-8");
  return JSON.parse(data);
}

// Reload settings (hot reload)
export function reloadSettings() {
  const settings = loadSettings();
  Object.assign(CONFIG, {
    ...settings.bot,
    allowedUsers: settings.allowedUsers,
    stickerKeywords: settings.stickers.keywords,
    readableFormats: settings.files.readableFormats,
  });
  console.log("[Config] ✅ Đã reload settings");
}

const settings = loadSettings();

export const CONFIG = {
  // Bot settings
  name: settings.bot.name,
  prefix: settings.bot.prefix,
  requirePrefix: settings.bot.requirePrefix,
  rateLimitMs: settings.bot.rateLimitMs,
  maxHistory: settings.bot.maxHistory,
  selfListen: settings.bot.selfListen,
  logging: settings.bot.logging,

  // Allowed users (empty = allow all)
  allowedUsers: settings.allowedUsers as string[],

  // Sticker keywords
  stickerKeywords: settings.stickers.keywords as string[],

  // Readable file formats
  readableFormats: settings.files.readableFormats as string[],

  // MIME types mapping
  mimeTypes: {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
  } as Record<string, string>,
};

export { SYSTEM_PROMPT, PROMPTS } from "./prompts.js";
