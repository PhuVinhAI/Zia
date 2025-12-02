import * as fs from "fs";
import * as path from "path";

let logStream: fs.WriteStream | null = null;
let fileLoggingEnabled = false;
let currentLogFile: string = "";

/**
 * Tạo tên file log với timestamp
 */
function generateLogFileName(basePath: string): string {
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  return path.join(dir, `${name}_${timestamp}${ext}`);
}

/**
 * Khởi tạo file logger - tạo file mới mỗi lần chạy
 */
export function initFileLogger(basePath: string): void {
  // Tạo thư mục logs nếu chưa có
  const dir = path.dirname(basePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Tạo file log mới với timestamp
  currentLogFile = generateLogFileName(basePath);

  // Mở stream để ghi log
  logStream = fs.createWriteStream(currentLogFile, { flags: "w" });

  // Ghi header khi khởi động
  const startMsg =
    `${"=".repeat(80)}\n` +
    `[${new Date().toISOString()}] 🚀 BOT STARTED\n` +
    `Log file: ${currentLogFile}\n` +
    `${"=".repeat(80)}\n\n`;
  logStream.write(startMsg);

  console.log(`[Logger] 📝 Ghi log ra file: ${currentLogFile}`);
}

/**
 * Lấy đường dẫn file log hiện tại
 */
export function getCurrentLogFile(): string {
  return currentLogFile;
}

/**
 * Ghi log ra file
 */
function writeToFile(level: string, ...args: any[]): void {
  if (!logStream) return;

  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    )
    .join(" ");

  logStream.write(`[${timestamp}] [${level}] ${message}\n`);
}

// Lưu console gốc
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
};

/**
 * Override console để ghi ra cả file
 */
export function enableFileLogging(): void {
  fileLoggingEnabled = true;

  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    writeToFile("LOG", ...args);
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    writeToFile("ERROR", ...args);
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    writeToFile("WARN", ...args);
  };

  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    writeToFile("INFO", ...args);
  };
}

/**
 * Kiểm tra file logging có bật không
 */
export function isFileLoggingEnabled(): boolean {
  return fileLoggingEnabled;
}

/**
 * Đóng file logger
 */
export function closeFileLogger(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

/**
 * Ghi log debug chi tiết (chỉ ghi vào file, không hiện console)
 */
export function debugLog(category: string, ...args: any[]): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`DEBUG:${category}`, ...args);
}

/**
 * Ghi log message đầy đủ (để debug)
 */
export function logMessage(
  direction: "IN" | "OUT",
  threadId: string,
  data: any
): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`MSG:${direction}`, `Thread: ${threadId}`, data);
}

/**
 * Log bước xử lý (để debug flow)
 */
export function logStep(step: string, details?: any): void {
  if (!fileLoggingEnabled) return;
  writeToFile("STEP", `>>> ${step}`, details || "");
}

/**
 * Log API call (Gemini, Zalo...)
 */
export function logAPI(
  service: string,
  action: string,
  request?: any,
  response?: any
): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`API:${service}`, action, { request, response });
}

/**
 * Log AI response đầy đủ
 */
export function logAIResponse(prompt: string, rawResponse: string): void {
  if (!fileLoggingEnabled) return;
  writeToFile("AI", "─".repeat(40));
  writeToFile(
    "AI:PROMPT",
    prompt.substring(0, 500) + (prompt.length > 500 ? "..." : "")
  );
  writeToFile("AI:RESPONSE", rawResponse);
  writeToFile("AI", "─".repeat(40));
}

/**
 * Log error với stack trace
 */
export function logError(context: string, error: any): void {
  if (!fileLoggingEnabled) return;
  writeToFile("ERROR", `[${context}]`, {
    message: error?.message || String(error),
    stack: error?.stack,
  });
}

/**
 * Log Zalo API call với request và response
 */
export function logZaloAPI(
  action: string,
  request: any,
  response?: any,
  error?: any
): void {
  if (!fileLoggingEnabled) return;

  if (error) {
    writeToFile(`ZALO:${action}`, "❌ ERROR", {
      request,
      error: error?.message || error,
    });
  } else {
    writeToFile(`ZALO:${action}`, { request, response });
  }
}
