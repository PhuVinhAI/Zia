/**
 * Logger Module - Pino-based structured logging
 * Production: cache logs in memory, send to Zalo when reaching threshold
 * Development: log to console + file with rotation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Writable } from 'node:stream';
import pino from 'pino';
import { formatFileTimestamp, now } from '../../shared/utils/datetime.js';

let logger: pino.Logger;
let sessionDir: string = '';
let fileLoggingEnabled = false;

// Production log cache
let logCache: string[] = [];
let zaloApi: any = null;
const LOG_CACHE_THRESHOLD = 1000; // Gửi khi đủ 1000 dòng
const MAX_LINES_PER_FILE = 1000;

/**
 * Set Zalo API để gửi log (gọi sau khi login)
 */
export function setLoggerZaloApi(api: any): void {
  zaloApi = api;
}

/**
 * Tạo timestamp cho tên thư mục
 */
function getTimestamp(): string {
  return formatFileTimestamp();
}

/**
 * Custom writable stream cho production - cache và gửi qua Zalo
 */
class ProductionLogStream extends Writable {
  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
    const data = chunk.toString().trim();
    if (data) {
      logCache.push(data);

      // Kiểm tra threshold và gửi
      if (logCache.length >= LOG_CACHE_THRESHOLD) {
        flushLogsToZalo().catch(console.error);
      }
    }
    callback();
  }

  _final(callback: (error?: Error | null) => void): void {
    // Flush remaining logs khi shutdown
    if (logCache.length > 0) {
      flushLogsToZalo().catch(console.error);
    }
    callback();
  }
}

/**
 * Gửi logs qua Zalo dưới dạng file
 */
async function flushLogsToZalo(): Promise<void> {
  const adminId = process.env.LOG_RECEIVER_ID;
  if (!zaloApi || !adminId || logCache.length === 0) {
    return;
  }

  try {
    const logsToSend = [...logCache];
    logCache = []; // Clear cache ngay để tránh duplicate

    const logContent = logsToSend.join('\n');
    const timestamp = formatFileTimestamp();
    const fileName = `logs_${timestamp}.txt`;

    // Tạo file tạm
    const tempPath = `/tmp/${fileName}`;
    fs.writeFileSync(tempPath, logContent, 'utf-8');

    // Gửi file qua Zalo
    await zaloApi.sendFile(adminId, tempPath, fileName);

    // Xóa file tạm
    fs.unlinkSync(tempPath);

    console.log(`📤 Sent ${logsToSend.length} log lines to admin`);
  } catch (error) {
    console.error('Failed to send logs to Zalo:', error);
    // Không push lại vào cache để tránh loop vô hạn
  }
}

/**
 * Force flush logs (gọi khi cần gửi ngay)
 */
export async function forceFlushLogs(): Promise<void> {
  await flushLogsToZalo();
}

/**
 * Get current log cache size
 */
export function getLogCacheSize(): number {
  return logCache.length;
}

/**
 * Custom writable stream với log rotation theo số dòng (development)
 */
class RotatingFileStream extends Writable {
  private basePath: string;
  private currentFile: string;
  private lineCount: number = 0;
  private fileIndex: number = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(basePath: string) {
    super();
    this.basePath = basePath;
    this.currentFile = this.getFileName(0);
    this.initStream();
  }

  private getFileName(index: number): string {
    const ext = path.extname(this.basePath);
    const base = this.basePath.slice(0, -ext.length);
    return index === 0 ? this.basePath : `${base}_${index}${ext}`;
  }

  private initStream(): void {
    if (fs.existsSync(this.currentFile)) {
      const content = fs.readFileSync(this.currentFile, 'utf-8');
      this.lineCount = content.split('\n').filter((line) => line.trim()).length;

      while (this.lineCount >= MAX_LINES_PER_FILE) {
        this.fileIndex++;
        this.currentFile = this.getFileName(this.fileIndex);
        if (fs.existsSync(this.currentFile)) {
          const content = fs.readFileSync(this.currentFile, 'utf-8');
          this.lineCount = content.split('\n').filter((line) => line.trim()).length;
        } else {
          this.lineCount = 0;
        }
      }
    }

    this.writeStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
  }

  private rotate(): void {
    if (this.writeStream) {
      this.writeStream.end();
    }
    this.fileIndex++;
    this.currentFile = this.getFileName(this.fileIndex);
    this.lineCount = 0;
    this.writeStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
  }

  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
    const data = chunk.toString();
    const lines = data.split('\n').filter((line) => line.trim()).length;

    if (this.lineCount + lines > MAX_LINES_PER_FILE) {
      this.rotate();
    }

    this.lineCount += lines;
    this.writeStream?.write(chunk, callback);
  }

  _final(callback: (error?: Error | null) => void): void {
    if (this.writeStream) {
      this.writeStream.end(callback);
    } else {
      callback();
    }
  }
}

/**
 * Khởi tạo Pino logger
 * Production: console + cache (gửi qua Zalo khi đủ threshold)
 * Development: console + file rotation
 */
export function initFileLogger(basePath: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const streams: pino.StreamEntry[] = [];

  // Console output (pretty) - luôn có
  streams.push({
    level: (process.env.LOG_LEVEL || 'info') as pino.Level,
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: !isProduction,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }),
  });

  if (isProduction) {
    // Production: cache logs và gửi qua Zalo
    streams.push({
      level: 'debug',
      stream: new ProductionLogStream(),
    });
    console.log('📝 Production mode: logs will be sent to Zalo');
  } else {
    // Development: ghi file như cũ
    const logsRoot = path.dirname(basePath);

    if (!fs.existsSync(logsRoot)) {
      fs.mkdirSync(logsRoot, { recursive: true });
    }

    sessionDir = path.join(logsRoot, getTimestamp());
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const logFile = path.join(sessionDir, 'bot.txt');
    const rotatingStream = new RotatingFileStream(logFile);

    streams.push({
      level: 'debug',
      stream: rotatingStream,
    });
  }

  logger = pino(
    {
      level: 'debug',
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams),
  );

  logger.info(
    { session: sessionDir || 'cloud', env: isProduction ? 'production' : 'development' },
    '🚀 Bot started',
  );
}

/**
 * Lấy session directory
 */
export function getSessionDir(): string {
  return sessionDir;
}

/**
 * Enable file logging (compatibility)
 */
export function enableFileLogging(): void {
  fileLoggingEnabled = true;
}

export function isFileLoggingEnabled(): boolean {
  return fileLoggingEnabled;
}

/**
 * Close logger (compatibility)
 */
export function closeFileLogger(): void {
  // Flush remaining logs in production
  if (process.env.NODE_ENV === 'production' && logCache.length > 0) {
    flushLogsToZalo().catch(console.error);
  }
}

// ═══════════════════════════════════════════════════
// LOGGING FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Debug log với category
 */
export function debugLog(category: string, ...args: any[]): void {
  if (!logger) return;
  const message = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  logger.debug({ category }, message);
}

/**
 * Log tin nhắn IN/OUT
 */
export function logMessage(direction: 'IN' | 'OUT', threadId: string, data: any): void {
  if (!logger) return;
  logger.info({ direction, threadId, data }, `Message ${direction}`);
}

/**
 * Log step trong flow
 */
export function logStep(step: string, details?: any): void {
  if (!logger) return;
  logger.info({ step, details }, `>>> ${step}`);
}

/**
 * Log API call
 */
export function logAPI(service: string, action: string, request?: any, response?: any): void {
  if (!logger) return;
  logger.debug({ service, action, request, response }, `API: ${service}`);
}

/**
 * Log AI response
 */
export function logAIResponse(prompt: string, rawResponse: string): void {
  if (!logger) return;
  logger.debug(
    {
      prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
      response: rawResponse,
    },
    'AI Response',
  );
}

/**
 * Log error
 */
export function logError(context: string, error: any): void {
  if (!logger) {
    console.error(`[${context}]`, error);
    return;
  }
  logger.error(
    {
      context,
      err: {
        message: error?.message || String(error),
        stack: error?.stack,
      },
    },
    `Error in ${context}`,
  );
}

/**
 * Log AI history (chỉ ghi file ở development)
 */
export function logAIHistory(threadId: string, history: any[]): void {
  if (!logger) return;

  logger.debug({ threadId, messageCount: history.length }, 'AI History updated');

  // Chỉ ghi file ở development
  if (!sessionDir) return;

  const historyFile = path.join(sessionDir, `history_${threadId}.json`);
  const data = {
    threadId,
    updatedAt: now(),
    messageCount: history.length,
    history: history.map((content, index) => {
      const processedParts = content.parts?.map((part: any) => {
        if (part.inlineData?.data) {
          return {
            ...part,
            inlineData: {
              ...part.inlineData,
              data: `${part.inlineData.data.substring(0, 100)}...[truncated]`,
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
  fs.writeFileSync(historyFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Log Zalo API
 */
export function logZaloAPI(action: string, request: any, response?: any, error?: any): void {
  if (!logger) return;

  if (error) {
    logger.error({ action, request, error: error?.message || error }, `ZALO: ${action} ERROR`);
  } else {
    logger.debug({ action, request, response }, `ZALO: ${action}`);
  }
}

/**
 * Log system prompt (chỉ ghi file ở development)
 */
export function logSystemPrompt(threadId: string, systemPrompt: string): void {
  if (!logger) return;

  logger.debug({ threadId }, 'System prompt set');

  // Chỉ ghi file ở development
  if (!sessionDir) return;

  const promptFile = path.join(sessionDir, `system_prompt_${threadId}.txt`);
  const promptData = `Thread: ${threadId}\nTimestamp: ${now()}\n${'='.repeat(80)}\n\n${systemPrompt}`;
  fs.writeFileSync(promptFile, promptData, 'utf-8');
}

// ═══════════════════════════════════════════════════
// DIRECT PINO ACCESS
// ═══════════════════════════════════════════════════

/**
 * Get raw Pino logger instance
 */
export function getLogger(): pino.Logger | undefined {
  return logger;
}

/**
 * Create child logger with bindings
 */
export function createChildLogger(bindings: Record<string, any>): pino.Logger | undefined {
  return logger?.child(bindings);
}
