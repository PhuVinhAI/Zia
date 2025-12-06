/**
 * Logger Module - Pino-based structured logging
 * Auto-rotate files daily, keep 7 days
 * Log rotation: tạo file mới khi đạt MAX_LINES_PER_FILE dòng
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Writable } from 'node:stream';
import pino from 'pino';
import { formatFileTimestamp, now } from '../../shared/utils/datetime.js';

let logger: pino.Logger;
let sessionDir: string = '';
let fileLoggingEnabled = false;

const MAX_LINES_PER_FILE = 1000;

/**
 * Tạo timestamp cho tên thư mục
 */
function getTimestamp(): string {
  return formatFileTimestamp();
}

/**
 * Custom writable stream với log rotation theo số dòng
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
    // Đếm số dòng hiện có nếu file đã tồn tại
    if (fs.existsSync(this.currentFile)) {
      const content = fs.readFileSync(this.currentFile, 'utf-8');
      this.lineCount = content.split('\n').filter((line) => line.trim()).length;

      // Nếu file đã đầy, tìm file tiếp theo
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

    // Kiểm tra nếu cần rotate
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
 * Khởi tạo Pino logger với auto-rotation
 * Production (cloud): chỉ log ra console
 * Development (local): log ra console + file
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

  // File output - chỉ khi không phải production
  if (!isProduction) {
    const logsRoot = path.dirname(basePath);

    // Tạo thư mục logs nếu chưa có
    if (!fs.existsSync(logsRoot)) {
      fs.mkdirSync(logsRoot, { recursive: true });
    }

    // Session dir cho history files
    sessionDir = path.join(logsRoot, getTimestamp());
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Log file trong session dir
    const logFile = path.join(sessionDir, 'bot.txt');

    // Tạo rotating file stream
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

  logger.info({ session: sessionDir || 'cloud', env: isProduction ? 'production' : 'development' }, '🚀 Bot started');
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
  // Pino handles cleanup automatically
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
 * Log AI history
 */
export function logAIHistory(threadId: string, history: any[]): void {
  if (!logger || !sessionDir) return;

  logger.debug({ threadId, messageCount: history.length }, 'AI History updated');

  // Ghi raw JSON vào file riêng
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
 * Log system prompt
 */
export function logSystemPrompt(threadId: string, systemPrompt: string): void {
  if (!logger || !sessionDir) return;

  logger.debug({ threadId }, 'System prompt set');

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
