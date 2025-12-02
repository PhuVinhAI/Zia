import * as fs from "fs";
import * as path from "path";

let logFile: string | null = null;
let logStream: fs.WriteStream | null = null;

/**
 * Khởi tạo file logger
 */
export function initFileLogger(filePath: string): void {
  logFile = filePath;

  // Tạo thư mục logs nếu chưa có
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Mở stream để ghi log
  logStream = fs.createWriteStream(filePath, { flags: "a" });

  // Ghi header khi khởi động
  const startMsg = `\n${"=".repeat(
    60
  )}\n[${new Date().toISOString()}] Bot started\n${"=".repeat(60)}\n`;
  logStream.write(startMsg);

  console.log(`[Logger] 📝 Ghi log ra file: ${filePath}`);
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
  writeToFile(`MSG:${direction}`, `Thread: ${threadId}`, data);
}
