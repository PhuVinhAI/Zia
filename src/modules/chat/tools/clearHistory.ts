/**
 * Tool: clearHistory - Xóa lịch sử hội thoại của thread hiện tại
 * AI có thể tự gọi tool này để xóa lịch sử chat (cả memory và database)
 */

import { debugLog } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { clearHistory } from '../../../shared/utils/history/history.js';

export const clearHistoryTool: ToolDefinition = {
  name: 'clearHistory',
  description:
    'Xóa toàn bộ lịch sử hội thoại của cuộc trò chuyện hiện tại (cả trong bộ nhớ và database). Dùng khi người dùng yêu cầu xóa lịch sử chat, reset cuộc trò chuyện, hoặc bắt đầu lại từ đầu.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const threadId = context.threadId;

      if (!threadId) {
        return { success: false, error: 'Không xác định được thread ID' };
      }

      debugLog('TOOL:clearHistory', `Clearing history for thread ${threadId}`);

      // Xóa history (cả memory và database)
      clearHistory(threadId);

      return {
        success: true,
        data: {
          message: 'Đã xóa toàn bộ lịch sử hội thoại',
          threadId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi xóa lịch sử: ${error.message}`,
      };
    }
  },
};
