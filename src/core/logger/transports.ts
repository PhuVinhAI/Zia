/**
 * Logger Transports - Interface và implementations cho log transport
 * Tách biệt để tránh circular dependency
 */

import { Writable } from 'node:stream';

// ═══════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════

/**
 * Interface cho log transport
 * Logger chỉ cần biết interface này, không cần biết implementation cụ thể
 */
export interface ILogTransport {
  /**
   * Gửi logs đi
   * @param logs - Mảng các dòng log
   * @returns Promise<boolean> - true nếu gửi thành công
   */
  send(logs: string[]): Promise<boolean>;

  /**
   * Kiểm tra transport có sẵn sàng không
   */
  isReady(): boolean;
}

// ═══════════════════════════════════════════════════
// PRODUCTION LOG CACHE
// ═══════════════════════════════════════════════════

let logCache: string[] = [];
let logTransport: ILogTransport | null = null;
let logCacheThreshold = 1000; // Default, can be updated via setLogCacheThreshold

/**
 * Đăng ký log transport (gọi sau khi có API)
 */
export function registerLogTransport(transport: ILogTransport): void {
  logTransport = transport;
}

/**
 * Get current log cache size
 */
export function getLogCacheSize(): number {
  return logCache.length;
}

/**
 * Get log cache (for testing)
 */
export function getLogCache(): string[] {
  return [...logCache];
}

/**
 * Clear log cache (for testing)
 */
export function clearLogCache(): void {
  logCache = [];
}

/**
 * Set log cache threshold (from config)
 */
export function setLogCacheThreshold(threshold: number): void {
  logCacheThreshold = threshold;
}

/**
 * Flush logs qua registered transport
 */
export async function flushLogs(): Promise<void> {
  if (!logTransport || !logTransport.isReady() || logCache.length === 0) {
    return;
  }

  try {
    const logsToSend = [...logCache];
    logCache = []; // Clear cache ngay để tránh duplicate

    const success = await logTransport.send(logsToSend);
    if (!success) {
      // Nếu gửi thất bại, không push lại để tránh loop vô hạn
      console.error('Failed to send logs via transport');
    }
  } catch (error) {
    console.error('Error flushing logs:', error);
  }
}

// ═══════════════════════════════════════════════════
// PRODUCTION LOG STREAM
// ═══════════════════════════════════════════════════

/**
 * Custom writable stream cho production - cache và gửi qua transport
 */
export class ProductionLogStream extends Writable {
  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void): void {
    const data = chunk.toString().trim();
    if (data) {
      logCache.push(data);

      // Kiểm tra threshold và gửi
      if (logCache.length >= logCacheThreshold) {
        flushLogs().catch(console.error);
      }
    }
    callback();
  }

  _final(callback: (error?: Error | null) => void): void {
    // Flush remaining logs khi shutdown
    if (logCache.length > 0) {
      flushLogs().catch(console.error);
    }
    callback();
  }
}
