/**
 * Schedule Task Tool - Cho phép Gemini tạo background tasks
 */
import { debugLog } from '../../../core/logger/logger.js';
import {
  ScheduleTaskSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { createTask, getNextCronTime, isValidCron } from '../../background-agent/index.js';

export const scheduleTaskTool: ToolDefinition = {
  name: 'scheduleTask',
  description: `Giao tiếp với Background Agent - nhờ thực hiện task trong tương lai. Dùng khi:
- Người dùng yêu cầu gửi tin nhắn sau một khoảng thời gian
- Người dùng nhờ nhắc nhở việc gì đó (sinh nhật, deadline, uống thuốc...)
- Muốn gửi tin chúc mừng vào thời điểm cụ thể
- Task lặp lại theo lịch (dùng cronExpression)

Lưu ý: 
- type="send_message": Gửi tin nhắn cho ai đó
- type="reminder": Nhắc nhở user về việc gì đó
- Có thể dùng targetDescription thay vì ID, agent nền sẽ tự tìm
- cronExpression: Dùng cho task lặp lại (format: "phút giờ ngày tháng thứ")

Ví dụ:
- "5 phút nữa nhắn A" → type="send_message", delayMinutes=5
- "Nhắc tui 8h sáng mai uống thuốc" → type="reminder", scheduledTime="2024-12-10T08:00:00"
- "Nhắc uống thuốc 8h sáng mỗi ngày" → type="reminder", cronExpression="0 8 * * *"
- "Nhắc họp 9h30 thứ 2 hàng tuần" → type="reminder", cronExpression="30 9 * * 1"
- "Chúc sinh nhật B vào 0h" → type="send_message", scheduledTime="2024-12-25T00:00:00"

Cron format: "phút giờ ngày tháng thứ"
- "0 8 * * *" = 8:00 mỗi ngày
- "30 12 * * 1-5" = 12:30 thứ 2-6
- "0 9 1 * *" = 9:00 ngày 1 mỗi tháng
- "0 0 25 12 *" = 0:00 ngày 25/12 (Giáng sinh)`,
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Loại task: send_message (gửi tin) hoặc reminder (nhắc nhở)',
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
      description: 'Nội dung tin nhắn (cho send_message)',
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
      name: 'scheduledTime',
      type: 'string',
      description: 'Thời điểm thực hiện (ISO format, VD: "2024-12-25T08:00:00"). Ưu tiên hơn delayMinutes',
      required: false,
    },
    {
      name: 'cronExpression',
      type: 'string',
      description: 'Cron expression cho task lặp lại (VD: "0 8 * * *" = 8h sáng mỗi ngày). Format: "phút giờ ngày tháng thứ"',
      required: false,
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

    const {
      type,
      targetUserId,
      targetThreadId,
      targetDescription,
      message,
      delayMinutes,
      scheduledTime,
      cronExpression,
      context,
    } = validation.data;

    try {
      // Validate business logic
      if ((type === 'send_message' || type === 'reminder') && !message) {
        return {
          success: false,
          error: `Cần có nội dung ${type === 'reminder' ? 'nhắc nhở' : 'tin nhắn'} cho task ${type}`,
        };
      }

      // Cho phép dùng targetDescription thay vì ID - agent nền sẽ resolve
      // Với reminder, mặc định gửi cho người tạo task nếu không có target
      if (!targetUserId && !targetThreadId && !targetDescription && type !== 'reminder') {
        return {
          success: false,
          error: 'Cần có targetUserId, targetThreadId hoặc targetDescription',
        };
      }

      // Validate cron expression nếu có
      if (cronExpression && !isValidCron(cronExpression)) {
        return {
          success: false,
          error: `Cron expression không hợp lệ: "${cronExpression}". Format: "phút giờ ngày tháng thứ" (VD: "0 8 * * *" = 8h sáng mỗi ngày)`,
        };
      }

      // Calculate scheduled time
      // Ưu tiên: cronExpression > scheduledTime > delayMinutes
      let scheduledAt = new Date();
      let scheduleDescription = '';

      if (cronExpression) {
        // Với cron, tính thời điểm chạy tiếp theo
        const nextRun = getNextCronTime(cronExpression);
        if (!nextRun) {
          return {
            success: false,
            error: `Không thể tính thời điểm chạy tiếp theo cho cron: "${cronExpression}"`,
          };
        }
        scheduledAt = nextRun;
        scheduleDescription = `theo lịch cron "${cronExpression}" (lần chạy tiếp: ${scheduledAt.toLocaleString('vi-VN')})`;
      } else if (scheduledTime) {
        scheduledAt = new Date(scheduledTime);
        if (isNaN(scheduledAt.getTime())) {
          return {
            success: false,
            error: 'scheduledTime không hợp lệ. Dùng format ISO: "2024-12-25T08:00:00"',
          };
        }
        scheduleDescription = `vào lúc ${scheduledAt.toLocaleString('vi-VN')}`;
      } else if (delayMinutes > 0) {
        scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);
        scheduleDescription = `sau ${delayMinutes} phút`;
      } else {
        scheduleDescription = 'ngay khi có thể';
      }

      // Build payload
      const payload: Record<string, any> = {};
      if (message) payload.message = message;
      if (targetDescription) payload.targetDescription = targetDescription;

      debugLog(
        'TOOL:scheduleTask',
        `Creating task: ${type} for ${targetUserId || targetThreadId || targetDescription}${cronExpression ? ` (cron: ${cronExpression})` : ''}`,
      );

      // Với reminder mà không có target, gửi cho người tạo
      const finalTargetUserId = targetUserId || (type === 'reminder' ? ctx.senderId : undefined);

      // Create task
      const task = await createTask({
        type,
        targetUserId: finalTargetUserId,
        targetThreadId,
        payload,
        context,
        scheduledAt,
        cronExpression,
        createdBy: ctx.senderId,
      });

      // Format response
      const typeLabels: Record<string, string> = {
        send_message: 'Gửi tin nhắn',
        reminder: 'Nhắc nhở',
      };

      return {
        success: true,
        data: {
          taskId: task.id,
          type,
          scheduledAt: scheduledAt.toISOString(),
          cronExpression: cronExpression || null,
          isRecurring: !!cronExpression,
          message: `✅ Đã lên lịch: ${typeLabels[type]} ${scheduleDescription}`,
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
