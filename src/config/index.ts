import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, "settings.json");

// Load settings từ JSON
function loadSettings() {
  const data = fs.readFileSync(settingsPath, "utf-8");
  return JSON.parse(data);
}

// Reload settings (hot reload)
export function reloadSettings() {
  try {
    const settings = loadSettings();
    Object.assign(CONFIG, {
      ...settings.bot,
      allowedUsers: settings.allowedUsers,
      stickerKeywords: settings.stickers.keywords,
    });
    console.log("[Config] ✅ Đã reload settings");
  } catch (error) {
    console.error("[Config] ❌ Lỗi reload settings:", error);
  }
}

// Watch file settings.json để auto reload
let debounceTimer: NodeJS.Timeout | null = null;
fs.watch(settingsPath, (eventType) => {
  if (eventType === "change") {
    // Debounce để tránh reload nhiều lần
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log("[Config] 🔄 Phát hiện thay đổi settings.json...");
      reloadSettings();
    }, 100);
  }
});

console.log("[Config] 👀 Đang watch settings.json để auto reload");

const settings = loadSettings();

export const CONFIG = {
  // Bot settings
  name: settings.bot.name,
  prefix: settings.bot.prefix,
  requirePrefix: settings.bot.requirePrefix,
  rateLimitMs: settings.bot.rateLimitMs,
  maxTokenHistory: settings.bot.maxTokenHistory || 300000, // 300k tokens
  selfListen: settings.bot.selfListen,
  logging: settings.bot.logging,

  // Allowed users (empty = allow all)
  allowedUsers: settings.allowedUsers as string[],

  // Sticker keywords
  stickerKeywords: settings.stickers.keywords as string[],

  // MIME types mapping
  mimeTypes: {
    // Documents
    pdf: "application/pdf",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    csv: "text/csv",
    xml: "application/xml",
    json: "application/json",
    md: "text/markdown",
    // Code
    js: "text/javascript",
    ts: "text/typescript",
    py: "text/x-python",
    java: "text/x-java",
    c: "text/x-c",
    cpp: "text/x-c++",
    cs: "text/x-csharp",
    go: "text/x-go",
    rb: "text/x-ruby",
    php: "text/x-php",
    swift: "text/x-swift",
    kt: "text/x-kotlin",
    rs: "text/x-rust",
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    aac: "audio/aac",
    ogg: "audio/ogg",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
  } as Record<string, string>,
};

export { SYSTEM_PROMPT, PROMPTS } from "./prompts.js";
export { AI_RESPONSE_SCHEMA, DEFAULT_RESPONSE } from "./schema.js";
export type { AIResponse, AIMessage } from "./schema.js";
