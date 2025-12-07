/**
 * Schedule Task Tool - Cho phép Gemini tạo background tasks
 */
import { debugLog } from '../../../core/logger/logger.js';
import {
  type ScheduleTaskParams,
  ScheduleTaskSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { createTask } from '../../background-agent/index.js';

export const scheduleTaskTool: ToolDefinition = {
  name: 'scheduleTask',
  description: `Lên lịch một task để hệ thống nền thực hiện. Dùng khi:
- Người dùng yêu cầu gửi tin nhắn sau một khoảng thời gian
- Cần gửi lời mời kết bạn
- Muốn thực hiện hành động không cần response ngay

Lưu ý: 
- accept_friend được xử lý tự động, không cần tạo task
- Có thể dùng targetDescription thay vì ID, agent nền sẽ tự tìm nhóm phù hợp

Ví dụ:
- "5 phút nữa nhắn A hỏi thăm" → scheduleTask với delayMinutes=5
- "Gửi tin vào nhóm lớp" → scheduleTask với targetDescription="nhóm lớp"
- "Kết bạn với số 0123456789" → scheduleTask type=send_friend_request`,
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Loại task: send_message, send_friend_request',
      required: true,
    },
    {
      name: 'targetUserId',
      type: 'string',
      description: 'ID người dùng đích',
      required: false,
    },
    {
      name: 'targetThreadId',
      type: 'string',
      description: 'ID thread/nhóm đích (cho send_message)',
      required: false,
    },
    {
      name: 'targetDescription',
      type: 'string',
      description: 'Mô tả nhóm/người nhận (VD: "nhóm lớp 12A") - agent nền sẽ tự tìm từ context',
      required: false,
    },
    {
      name: 'message',
      type: 'string',
      description: 'Nội dung tin nhắn (cho send_message, send_friend_request)',
      required: false,
    },
    {
      name: 'delayMinutes',
      type: 'number',
      description: 'Số phút delay trước khi thực hiện (0 = ngay lập tức)',
      required: false,
      default: 0,
    },
    {
      name: 'context',
      type: 'string',
      description: 'Ngữ cảnh/lý do tạo task',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, ctx: ToolContext): Promise<ToolResult> => {
    // Validate với Zod schema
    const validation = validateParamsWithExample(ScheduleTaskSchema, params, 'scheduleTask');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { type, targetUserId, targetThreadId, targetDescription, message, delayMinutes, context } =
      validation.data;

    try {
      // Validate business logic
      if (type === 'send_message' && !message) {
        return {
          success: false,
          error: 'Cần có nội dung tin nhắn cho task send_message',
        };
      }

      // Cho phép dùng targetDescription thay vì ID - agent nền sẽ resolve
      if (!targetUserId && !targetThreadId && !targetDescription) {
        return {
          success: false,
          error: 'Cần có targetUserId, targetThreadId hoặc targetDescription',
        };
      }

      // Calculate scheduled time
      const scheduledAt = new Date();
      if (delayMinutes > 0) {
        scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);
      }

      // Build payload
      const payload: Record<string, any> = {};
      if (message) payload.message = message;
      if (targetDescription) payload.targetDescription = targetDescription;

      debugLog(
        'TOOL:scheduleTask',
        `Creating task: ${type} for ${targetUserId || targetThreadId || targetDescription}`,
      );

      // Create task
      const task = await createTask({
        type,
        targetUserId,
        targetThreadId,
        payload,
        context,
        scheduledAt,
        createdBy: ctx.senderId,
      });

      // Format response
      const typeLabels: Record<string, string> = {
        send_message: 'Gửi tin nhắn',
        send_friend_request: 'Gửi lời mời kết bạn',
      };

      const delayText = delayMinutes > 0 ? `sau ${delayMinutes} phút` : 'ngay khi có thể';

      return {
        success: true,
        data: {
          taskId: task.id,
          type,
          scheduledAt: scheduledAt.toISOString(),
          message: `✅ Đã lên lịch: ${typeLabels[type]} ${delayText}`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Không thể tạo task: ${error.message}`,
      };
    }
  },
};
