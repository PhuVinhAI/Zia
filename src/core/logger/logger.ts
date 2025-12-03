/**
 * Logger Module - Pino-based structured logging
 * Auto-rotate files daily, keep 7 days
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import pino from 'pino';

let logger: pino.Logger;
let sessionDir: string = '';
let fileLoggingEnabled = false;

/**
 * Tạo timestamp cho tên thư mục
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/**
 * Khởi tạo Pino logger với auto-rotation
 */
export function initFileLogger(basePath: string): void {
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

  // Pino transport config
  const transport = pino.transport({
    targets: [
      // Console output (pretty)
      {
        target: 'pino-pretty',
        level: process.env.LOG_LEVEL || 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      // File output trong session dir
      {
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: logFile,
          mkdir: true,
        },
      },
    ],
  });

  logger = pino(
    {
      level: 'debug',
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    transport,
  );

  logger.info({ session: sessionDir }, '🚀 Bot started');
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
    updatedAt: new Date().toISOString(),
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
  const data = `Thread: ${threadId}\nTimestamp: ${new Date().toISOString()}\n${'='.repeat(
    80,
  )}\n\n${systemPrompt}`;
  fs.writeFileSync(promptFile, data, 'utf-8');
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
