/**
 * Reminder Tools - Quản lý lịch hẹn/nhắc nhở trong nhóm Zalo
 * API: createReminder, getReminder, removeReminder
 */

import { debugLog, logZaloAPI } from '../../../../core/logger/logger.js';
import { ThreadType } from '../../../../infrastructure/zalo/zalo.service.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../../shared/types/tools.types.js';

// Repeat mode enum (tự định nghĩa vì zca-js không export)
const ReminderRepeatMode = {
  None: 0,
  Daily: 1,
  Weekly: 2,
  Monthly: 3,
} as const;

// Repeat mode mapping
const REPEAT_MODES: Record<string, number> = {
  none: ReminderRepeatMode.None,
  daily: ReminderRepeatMode.Daily,
  weekly: ReminderRepeatMode.Weekly,
  monthly: ReminderRepeatMode.Monthly,
};

// ═══════════════════════════════════════════════════
// CREATE REMINDER - Tạo nhắc hẹn
// ═══════════════════════════════════════════════════

export const createReminderTool: ToolDefinition = {
  name: 'createReminder',
  description:
    'Tạo lịch hẹn/nhắc nhở trong nhóm. Zalo sẽ thông báo khi đến giờ. Trả về reminder_id. LƯU Ý: Nếu user nói giờ mơ hồ (VD: "2h", "3 giờ"), HÃY HỎI LẠI để xác nhận chính xác (sáng/chiều, hôm nay/ngày mai).',
  parameters: [
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề nhắc nhở (VD: "Deadline nộp báo cáo")',
      required: true,
    },
    {
      name: 'startTime',
      type: 'number',
      description:
        'Thời gian nhắc (Unix timestamp ms, múi giờ UTC). CÁCH TÍNH: Lấy timestamp hiện tại từ system prompt + số ms cần thêm. VD: "1 giờ nữa" = timestamp_hiện_tại + 3600000. "14:00 hôm nay" = tính từ 00:00 hôm nay + 14*3600000. QUAN TRỌNG: Timestamp phải > Date.now()!',
      required: true,
    },
    {
      name: 'repeat',
      type: 'string',
      description: 'Chế độ lặp: none (không lặp), daily, weekly, monthly',
      required: false,
      default: 'none',
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { title, startTime, repeat = 'none' } = params;

      if (!title || typeof title !== 'string') {
        return { success: false, error: 'Thiếu tiêu đề nhắc nhở (title)' };
      }

      if (!startTime || typeof startTime !== 'number') {
        return { success: false, error: 'Thiếu thời gian nhắc (startTime - Unix timestamp ms)' };
      }

      // Validate startTime phải trong tương lai
      if (startTime <= Date.now()) {
        return { success: false, error: 'Thời gian nhắc phải trong tương lai' };
      }

      const repeatMode = REPEAT_MODES[repeat] ?? ReminderRepeatMode.None;

      debugLog(
        'TOOL:createReminder',
        `Creating reminder: "${title}" at ${new Date(startTime).toISOString()} repeat=${repeat}`,
      );

      const reminderOptions = {
        title,
        startTime,
        repeat: repeatMode,
      };

      const result = await context.api.createReminder(
        reminderOptions,
        context.threadId,
        ThreadType.Group,
      );
      logZaloAPI('tool:createReminder', { threadId: context.threadId, reminderOptions }, result);

      const scheduledTime = new Date(startTime);

      return {
        success: true,
        data: {
          reminder_id: result.id,
          title: title,
          scheduledAt: scheduledTime.toLocaleString('vi-VN'),
          repeat: repeat,
          message: `Đã tạo nhắc hẹn "${title}" vào ${scheduledTime.toLocaleString('vi-VN')}`,
          hint: 'Lưu reminder_id để xem hoặc xóa sau',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:createReminder', `Error: ${error.message}`);
      return { success: false, error: `Lỗi tạo nhắc hẹn: ${error.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// GET REMINDER - Xem chi tiết nhắc hẹn
// ═══════════════════════════════════════════════════

export const getReminderTool: ToolDefinition = {
  name: 'getReminder',
  description: 'Lấy chi tiết một nhắc hẹn. Cần reminder_id.',
  parameters: [
    {
      name: 'reminderId',
      type: 'string',
      description: 'ID của nhắc hẹn (lấy từ createReminder)',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { reminderId } = params;

      if (!reminderId) {
        return { success: false, error: 'Thiếu reminderId' };
      }

      debugLog('TOOL:getReminder', `Getting reminder: ${reminderId}`);

      const result = await context.api.getReminder(String(reminderId));
      logZaloAPI('tool:getReminder', { reminderId }, result);

      return {
        success: true,
        data: {
          reminder_id: reminderId,
          title: result.title,
          startTime: result.startTime,
          scheduledAt: new Date(result.startTime).toLocaleString('vi-VN'),
          repeat: result.repeat,
          raw: result,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getReminder', `Error: ${error.message}`);
      return { success: false, error: `Lỗi lấy chi tiết nhắc hẹn: ${error.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// REMOVE REMINDER - Xóa nhắc hẹn
// ═══════════════════════════════════════════════════

export const removeReminderTool: ToolDefinition = {
  name: 'removeReminder',
  description: 'Xóa một nhắc hẹn. Cần reminder_id.',
  parameters: [
    {
      name: 'reminderId',
      type: 'string',
      description: 'ID của nhắc hẹn cần xóa',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { reminderId } = params;

      if (!reminderId) {
        return { success: false, error: 'Thiếu reminderId' };
      }

      debugLog('TOOL:removeReminder', `Removing reminder: ${reminderId}`);

      const result = await context.api.removeReminder(
        String(reminderId),
        context.threadId,
        ThreadType.Group,
      );
      logZaloAPI('tool:removeReminder', { reminderId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          reminder_id: reminderId,
          message: 'Đã xóa nhắc hẹn',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:removeReminder', `Error: ${error.message}`);
      return { success: false, error: `Lỗi xóa nhắc hẹn: ${error.message}` };
    }
  },
};
