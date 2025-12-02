import * as fs from "fs";
import * as path from "path";

let logStream: fs.WriteStream | null = null;
let fileLoggingEnabled = false;
let sessionDir: string = ""; // Thư mục phiên hiện tại

/**
 * Tạo timestamp cho tên thư mục/file
 */
function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
}

/**
 * Khởi tạo file logger - tạo thư mục phiên mới mỗi lần chạy
 * Cấu trúc: logs/2025-12-02_12-55-03/bot.txt
 */
export function initFileLogger(basePath: string): void {
  const logsRoot = path.dirname(basePath);

  // Tạo thư mục phiên với timestamp
  sessionDir = path.join(logsRoot, getTimestamp());
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Tạo file log chính
  const logFile = path.join(sessionDir, "bot.txt");
  logStream = fs.createWriteStream(logFile, { flags: "w" });

  const startMsg =
    `${"=".repeat(80)}\n` +
    `[${new Date().toISOString()}] 🚀 BOT STARTED\n` +
    `Session: ${sessionDir}\n` +
    `${"=".repeat(80)}\n\n`;
  logStream.write(startMsg);

  console.log(`[Logger] 📝 Session dir: ${sessionDir}`);
}

/**
 * Lấy đường dẫn thư mục phiên hiện tại
 */
export function getSessionDir(): string {
  return sessionDir;
}

/**
 * Ghi log ra file bot.txt
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

export function debugLog(category: string, ...args: any[]): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`DEBUG:${category}`, ...args);
}

export function logMessage(
  direction: "IN" | "OUT",
  threadId: string,
  data: any
): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`MSG:${direction}`, `Thread: ${threadId}`, data);
}

export function logStep(step: string, details?: any): void {
  if (!fileLoggingEnabled) return;
  writeToFile("STEP", `>>> ${step}`, details || "");
}

export function logAPI(
  service: string,
  action: string,
  request?: any,
  response?: any
): void {
  if (!fileLoggingEnabled) return;
  writeToFile(`API:${service}`, action, { request, response });
}

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

export function logError(context: string, error: any): void {
  if (!fileLoggingEnabled) return;
  writeToFile("ERROR", `[${context}]`, {
    message: error?.message || String(error),
    stack: error?.stack,
  });
}

/**
 * Log full history của thread (ghi raw JSON)
 */
export function logAIHistory(threadId: string, history: any[]): void {
  if (!fileLoggingEnabled || !sessionDir) return;

  // Ghi vào bot.txt (summary)
  writeToFile("AI:HISTORY", `Thread ${threadId}: ${history.length} messages`);

  // Ghi raw JSON vào file history riêng
  const historyFile = path.join(sessionDir, `history_${threadId}.json`);

  const data = {
    threadId,
    updatedAt: new Date().toISOString(),
    messageCount: history.length,
    history: history.map((content, index) => {
      // Clone và xử lý inlineData (base64 quá dài thì cắt bớt để file không quá nặng)
      const processedParts = content.parts?.map((part: any) => {
        if (part.inlineData?.data) {
          return {
            ...part,
            inlineData: {
              ...part.inlineData,
              data: part.inlineData.data.substring(0, 100) + "...[truncated]",
            },
          };
        }
        return part;
      });

      return {
        index,
        role: content.role,
        parts: processedParts || content.parts,
      };
    }),
  };

  fs.writeFileSync(historyFile, JSON.stringify(data, null, 2), "utf-8");
}

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
