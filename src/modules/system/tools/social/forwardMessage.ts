/**
 * Tool: forwardMessage - Chuyển tiếp tin nhắn đến người/nhóm khác
 */

import { debugLog, logZaloAPI } from '../../../../core/logger/logger.js';
import { ThreadType } from '../../../../infrastructure/zalo/zalo.service.js';
import {
  ForwardMessageSchema,
  validateParamsWithExample,
} from '../../../../shared/schemas/tools.schema.js';
import type {
  ToolContext,
  ToolDefinition,
  ToolResult,
} from '../../../../shared/types/tools.types.js';

export const forwardMessageTool: ToolDefinition = {
  name: 'forwardMessage',
  description:
    'Chuyển tiếp (forward) tin nhắn đến một hoặc nhiều người/nhóm. Hỗ trợ forward tin nhắn text với đầy đủ thông tin nguồn gốc.',
  parameters: [
    {
      name: 'message',
      type: 'string',
      description: 'Nội dung tin nhắn cần forward',
      required: true,
    },
    {
      name: 'targetThreadIds',
      type: 'string',
      description:
        'Danh sách ID người/nhóm nhận (cách nhau bởi dấu phẩy). VD: "123,456,789". Tối đa 5 người/nhóm.',
      required: true,
    },
    {
      name: 'targetType',
      type: 'string',
      description: 'Loại người nhận: "user" (cá nhân) hoặc "group" (nhóm). Mặc định: user',
      required: false,
    },
    {
      name: 'originalMsgId',
      type: 'string',
      description: 'ID tin nhắn gốc (nếu có) để hiển thị dạng forward',
      required: false,
    },
    {
      name: 'originalTimestamp',
      type: 'number',
      description: 'Timestamp của tin nhắn gốc (nếu có)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(ForwardMessageSchema, params, 'forwardMessage');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      // Parse targetThreadIds từ string thành array
      const threadIds = data.targetThreadIds
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);

      if (threadIds.length === 0) {
        return { success: false, error: 'Không có ID người/nhóm nhận hợp lệ' };
      }

      if (threadIds.length > 5) {
        return { success: false, error: 'Tối đa chỉ được forward đến 5 người/nhóm cùng lúc' };
      }

      // Xác định loại thread
      const threadType = data.targetType === 'group' ? ThreadType.Group : ThreadType.User;

      // Tạo payload forward
      const forwardPayload: any = {
        message: data.message,
        ttl: 0,
      };

      // Thêm reference nếu có thông tin tin nhắn gốc
      if (data.originalMsgId) {
        forwardPayload.reference = {
          id: data.originalMsgId,
          ts: data.originalTimestamp || Date.now(),
          logSrcType: 1, // 1 = Chat
          fwLvl: 0, // Cấp độ forward
        };
      }

      debugLog(
        'TOOL:forwardMessage',
        `Forwarding to ${threadIds.length} recipients: ${threadIds.join(', ')}`,
      );

      // Gọi API forward
      const result = await context.api.forwardMessage(forwardPayload, threadIds, threadType);
      logZaloAPI('tool:forwardMessage', { threadIds, targetType: data.targetType }, result);

      return {
        success: true,
        data: {
          message: 'Đã chuyển tiếp tin nhắn thành công',
          recipients: threadIds,
          recipientCount: threadIds.length,
          targetType: data.targetType || 'user',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:forwardMessage', `Error: ${error.message}`);
      return {
        success: false,
        error: `Lỗi chuyển tiếp tin nhắn: ${error.message}`,
      };
    }
  },
};
