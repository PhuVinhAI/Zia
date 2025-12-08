/**
 * Zalo Log Transport - Gửi logs qua Zalo API
 * Implement ILogTransport interface
 */

import type { ILogTransport } from '../../../core/logger/transports.js';
import { formatFileTimestamp } from '../../../shared/utils/datetime.js';

/**
 * Transport gửi logs qua Zalo dưới dạng file attachment
 */
export class ZaloLogTransport implements ILogTransport {
  private api: any = null;
  private adminId: string | undefined;
  private ThreadType: any;

  constructor() {
    this.adminId = process.env.LOG_RECEIVER_ID;
  }

  /**
   * Set Zalo API (gọi sau khi login)
   */
  setApi(api: any, ThreadType: any): void {
    this.api = api;
    this.ThreadType = ThreadType;
  }

  /**
   * Kiểm tra transport có sẵn sàng không
   */
  isReady(): boolean {
    return this.api !== null && this.adminId !== undefined;
  }

  /**
   * Gửi logs qua Zalo
   */
  async send(logs: string[]): Promise<boolean> {
    if (!this.isReady() || logs.length === 0) {
      return false;
    }

    try {
      const logContent = logs.join('\n');
      const timestamp = formatFileTimestamp();
      const fileName = `logs_${timestamp}.txt`;

      // Convert log content to Buffer
      const logBuffer = Buffer.from(logContent, 'utf-8');

      // Gửi file qua Zalo dùng attachment
      const attachment = {
        filename: fileName,
        data: logBuffer,
        metadata: {
          totalSize: logBuffer.length,
          width: 0,
          height: 0,
        },
      };

      await this.api.sendMessage(
        {
          msg: `📋 Log file (${logs.length} dòng)`,
          attachments: [attachment],
        },
        this.adminId,
        this.ThreadType.User,
      );

      console.log(`📤 Sent ${logs.length} log lines to admin`);
      return true;
    } catch (error) {
      console.error('Failed to send logs to Zalo:', error);
      return false;
    }
  }
}

// Singleton instance
export const zaloLogTransport = new ZaloLogTransport();
