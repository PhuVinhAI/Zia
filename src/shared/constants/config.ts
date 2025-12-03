import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { debugLog, logError } from "../../core/logger/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Đường dẫn settings.json ở root project
const projectRoot = path.resolve(__dirname, "../../../");
const settingsPath = path.join(projectRoot, "settings.json");

// Load settings từ JSON
function loadSettings() {
  debugLog("CONFIG", `Loading settings from ${settingsPath}`);
  const data = fs.readFileSync(settingsPath, "utf-8");
  const settings = JSON.parse(data);
  debugLog("CONFIG", `Settings loaded: ${JSON.stringify(settings.bot)}`);
  return settings;
}

// Reload settings (hot reload)
export function reloadSettings() {
  try {
    debugLog("CONFIG", "Reloading settings...");
    const settings = loadSettings();
    Object.assign(CONFIG, {
      ...settings.bot,
      allowedUserIds: settings.allowedUserIds || [],
      stickerKeywords: settings.stickers.keywords,
    });
    console.log("[Config] ✅ Đã reload settings");
    debugLog(
      "CONFIG",
      `Settings reloaded: ${JSON.stringify({
        name: CONFIG.name,
        prefix: CONFIG.prefix,
        useStreaming: CONFIG.useStreaming,
        allowedUserIds: CONFIG.allowedUserIds,
      })}`
    );
  } catch (error) {
    console.error("[Config] ❌ Lỗi reload settings:", error);
    logError("reloadSettings", error);
  }
}

// Watch file settings.json để auto reload
let debounceTimer: NodeJS.Timeout | null = null;
try {
  fs.watch(settingsPath, (eventType) => {
    if (eventType === "change") {
      // Debounce để tránh reload nhiều lần
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log("[Config] 🔄 Phát hiện thay đổi settings.json...");
        debugLog("CONFIG", "settings.json changed, triggering reload");
        reloadSettings();
      }, 100);
    }
  });
  console.log("[Config] 👀 Đang watch settings.json để auto reload");
  debugLog("CONFIG", `Watching ${settingsPath} for changes`);
} catch (err) {
  console.warn(
    "[Config] ⚠️ Không thể watch settings.json:",
    (err as Error).message
  );
  debugLog(
    "CONFIG",
    `Failed to watch settings.json: ${(err as Error).message}`
  );
}

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
  useStreaming: settings.bot.useStreaming ?? true, // Bật streaming mặc định
  useCharacter: settings.bot.useCharacter ?? true, // Bật character roleplay
  fileLogging: settings.bot.fileLogging ?? false, // Ghi log ra file
  logFile: settings.bot.logFile || "logs/bot.txt", // Đường dẫn file log
  unauthorizedLogFile:
    settings.bot.unauthorizedLogFile || "logs/unauthorized.json", // File log user chưa được cấp phép
  maxToolDepth: settings.bot.maxToolDepth ?? 10, // Giới hạn độ sâu tool calls
  showToolCalls: settings.bot.showToolCalls ?? true, // Hiển thị thông báo khi gọi tool

  // Cloud Debug - cho phép test AI trong "Cloud của tôi"
  cloudDebug: {
    enabled: settings.bot.cloudDebug?.enabled ?? false,
    prefix: settings.bot.cloudDebug?.prefix || "#bot",
  },

  // Allowed user IDs (empty = allow all)
  allowedUserIds: (settings.allowedUserIds || []) as string[],

  // Retry config cho Gemini API
  retry: {
    maxRetries: settings.retry?.maxRetries ?? 3,
    baseDelayMs: settings.retry?.baseDelayMs ?? 2000,
    retryableStatusCodes: settings.retry?.retryableStatusCodes ?? [
      503, 429, 500, 502, 504,
    ],
  },

  // Sticker keywords
  stickerKeywords: settings.stickers.keywords as string[],

  // History loader config (pagination với anti-ban)
  historyLoader: {
    enabled: settings.historyLoader?.enabled ?? true,
    loadFromDb: settings.historyLoader?.loadFromDb ?? true,
    defaultLimit: settings.historyLoader?.defaultLimit ?? 100,
    minDelayMs: settings.historyLoader?.minDelayMs ?? 2000,
    maxDelayMs: settings.historyLoader?.maxDelayMs ?? 5000,
    pageTimeoutMs: settings.historyLoader?.pageTimeoutMs ?? 10000,
    loadUser: settings.historyLoader?.loadUser ?? true,
    loadGroup: settings.historyLoader?.loadGroup ?? false,
  },

  // Buffer config cho message batching
  buffer: {
    delayMs: settings.buffer?.delayMs ?? 2500,
    typingRefreshMs: settings.buffer?.typingRefreshMs ?? 3000,
  },

  // Fetch config cho download file
  fetch: {
    timeoutMs: settings.fetch?.timeoutMs ?? 60000,
    maxRetries: settings.fetch?.maxRetries ?? 3,
    retryDelayMs: settings.fetch?.retryDelayMs ?? 2000,
    maxTextConvertSizeMB: settings.fetch?.maxTextConvertSizeMB ?? 20,
  },

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

export { DEFAULT_RESPONSE, parseAIResponse } from "../types/config.schema.js";
export type { AIResponse, AIMessage } from "../types/config.schema.js";
