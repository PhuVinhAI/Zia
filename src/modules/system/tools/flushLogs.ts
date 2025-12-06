/**
 * Flush Logs Tool - Gửi log ngay lập tức qua Zalo
 * AI có thể gọi tool này để gửi log mà không cần đợi đủ 1000 dòng
 */

import { forceFlushLogs, getLogCacheSize } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

export const flushLogsTool: ToolDefinition = {
  name: 'flush_logs',
  description:
    'Gửi log ngay lập tức qua Zalo cho admin mà không cần đợi đủ 1000 dòng. Dùng khi cần kiểm tra log gấp hoặc debug.',
  parameters: [],
  execute: async (_params: Record<string, any>, _context: ToolContext): Promise<ToolResult> => {
    const cacheSize = getLogCacheSize();

    if (cacheSize === 0) {
      return {
        success: false,
        error: 'Không có log nào trong cache để gửi',
      };
    }

    try {
      await forceFlushLogs();
      return {
        success: true,
        data: {
          message: `Đã gửi ${cacheSize} dòng log qua Zalo cho admin`,
          linesSent: cacheSize,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Lỗi khi gửi log: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
