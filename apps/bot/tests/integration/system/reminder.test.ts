/**
 * Integration Test: Reminder Tools
 * Test chức năng tạo, xem và xóa nhắc hẹn
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createReminderTool,
  getReminderTool,
  removeReminderTool,
} from '../../../src/modules/system/tools/reminder.js';
import { mockToolContext } from '../setup.js';

// Mock data
const mockReminderId = 'reminder-123';
const mockReminderDetail = {
  id: mockReminderId,
  title: 'Deadline nộp báo cáo',
  startTime: Date.now() + 3600000,
  repeat: 0,
};

// Mock API
const createMockApi = () => ({
  createReminder: async (options: any, threadId: string, threadType: number) => ({
    id: mockReminderId,
    title: options.title,
    startTime: options.startTime,
  }),
  getReminder: async (reminderId: string) => {
    if (reminderId === mockReminderId) return mockReminderDetail;
    throw new Error('Reminder not found');
  },
  removeReminder: async (reminderId: string, threadId: string, threadType: number) => ({
    success: true,
  }),
});

describe('Reminder Tools Integration', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    mockApi = createMockApi();
  });


  // ═══════════════════════════════════════════════════
  // CREATE REMINDER
  // ═══════════════════════════════════════════════════

  describe('createReminder', () => {
    test('tạo reminder thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };
      const futureTime = Date.now() + 3600000; // 1 giờ nữa

      const result = await createReminderTool.execute(
        {
          title: 'Deadline nộp báo cáo',
          startTime: futureTime,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.reminder_id).toBe(mockReminderId);
      expect(result.data.title).toBe('Deadline nộp báo cáo');
      expect(result.data.scheduledAt).toBeDefined();
      expect(result.data.hint).toContain('reminder_id');
    });

    test('tạo reminder với repeat mode', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };
      const futureTime = Date.now() + 3600000;

      const result = await createReminderTool.execute(
        {
          title: 'Họp hàng ngày',
          startTime: futureTime,
          repeat: 'daily',
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.repeat).toBe('daily');
    });

    test('lỗi khi thiếu title', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createReminderTool.execute(
        {
          startTime: Date.now() + 3600000,
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    test('lỗi khi thiếu startTime', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createReminderTool.execute(
        {
          title: 'Test reminder',
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('startTime');
    });


    test('lỗi khi startTime trong quá khứ', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await createReminderTool.execute(
        {
          title: 'Test reminder',
          startTime: Date.now() - 3600000, // 1 giờ trước
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('tương lai');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        createReminder: async () => {
          throw new Error('Permission denied');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: 'group-123' };

      const result = await createReminderTool.execute(
        {
          title: 'Test',
          startTime: Date.now() + 3600000,
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi tạo nhắc hẹn');
    });
  });

  // ═══════════════════════════════════════════════════
  // GET REMINDER
  // ═══════════════════════════════════════════════════

  describe('getReminder', () => {
    test('lấy chi tiết reminder thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getReminderTool.execute({ reminderId: mockReminderId }, context);

      expect(result.success).toBe(true);
      expect(result.data.reminder_id).toBe(mockReminderId);
      expect(result.data.title).toBe('Deadline nộp báo cáo');
      expect(result.data.scheduledAt).toBeDefined();
    });

    test('lỗi khi thiếu reminderId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getReminderTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('reminderId');
    });

    test('lỗi khi reminder không tồn tại', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await getReminderTool.execute({ reminderId: 'invalid-id' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy chi tiết');
    });
  });


  // ═══════════════════════════════════════════════════
  // REMOVE REMINDER
  // ═══════════════════════════════════════════════════

  describe('removeReminder', () => {
    test('xóa reminder thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await removeReminderTool.execute({ reminderId: mockReminderId }, context);

      expect(result.success).toBe(true);
      expect(result.data.reminder_id).toBe(mockReminderId);
      expect(result.data.message).toContain('xóa');
    });

    test('lỗi khi thiếu reminderId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'group-123' };

      const result = await removeReminderTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('reminderId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        removeReminder: async () => {
          throw new Error('Reminder not found');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: 'group-123' };

      const result = await removeReminderTool.execute({ reminderId: mockReminderId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi xóa');
    });
  });
});
