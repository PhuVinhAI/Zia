/**
 * Integration Test: flushLogs Tool
 * Test chức năng gửi log ngay lập tức qua Zalo
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { flushLogsTool } from '../../../src/modules/system/tools/flushLogs.js';
import { mockToolContext } from '../setup.js';

// Mock logger functions
const mockForceFlushLogs = mock(() => Promise.resolve());
const mockGetLogCacheSize = mock(() => 0);

mock.module('../../../src/core/logger/logger.js', () => ({
  forceFlushLogs: mockForceFlushLogs,
  getLogCacheSize: mockGetLogCacheSize,
}));

describe('flushLogs Tool Integration', () => {
  beforeEach(() => {
    mockForceFlushLogs.mockClear();
    mockGetLogCacheSize.mockClear();
  });

  test('flushLogs - tool definition đúng', () => {
    expect(flushLogsTool.name).toBe('flush_logs');
    expect(flushLogsTool.description).toContain('log');
    expect(flushLogsTool.parameters).toEqual([]);
  });

  test('flushLogs - không có log trong cache', async () => {
    mockGetLogCacheSize.mockReturnValue(0);

    const result = await flushLogsTool.execute({}, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Không có log');
  });

  test('flushLogs - gửi log thành công', async () => {
    mockGetLogCacheSize.mockReturnValue(150);
    mockForceFlushLogs.mockResolvedValue(undefined);

    const result = await flushLogsTool.execute({}, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.message).toContain('150');
    expect(result.data.linesSent).toBe(150);
    expect(mockForceFlushLogs).toHaveBeenCalled();
  });

  test('flushLogs - xử lý lỗi khi gửi', async () => {
    mockGetLogCacheSize.mockReturnValue(100);
    mockForceFlushLogs.mockRejectedValue(new Error('Network error'));

    const result = await flushLogsTool.execute({}, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lỗi');
    expect(result.error).toContain('Network error');
  });
});
