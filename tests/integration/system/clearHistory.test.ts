/**
 * Integration Test: clearHistory Tool
 * Test chức năng xóa lịch sử hội thoại
 */

import { describe, test, expect } from 'bun:test';
import { clearHistoryTool } from '../../../src/modules/system/tools/clearHistory.js';
import { mockToolContext } from '../setup.js';

describe('clearHistory Tool Integration', () => {
  test('clearHistory - xóa history thành công', async () => {
    const result = await clearHistoryTool.execute({}, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.message).toContain('Đã xóa');
    expect(result.data.threadId).toBe(mockToolContext.threadId);
  });

  test('clearHistory - với context khác', async () => {
    const customContext = {
      ...mockToolContext,
      threadId: 'custom-thread-' + Date.now(),
    };

    const result = await clearHistoryTool.execute({}, customContext);

    expect(result.success).toBe(true);
    expect(result.data.threadId).toBe(customContext.threadId);
  });

  test('clearHistory - error khi không có threadId', async () => {
    const noThreadContext = {
      ...mockToolContext,
      threadId: '',
    };

    const result = await clearHistoryTool.execute({}, noThreadContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('thread ID');
  });

  test('clearHistory - gọi nhiều lần không lỗi', async () => {
    // Gọi 3 lần liên tiếp
    for (let i = 0; i < 3; i++) {
      const result = await clearHistoryTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
    }
  });
});
