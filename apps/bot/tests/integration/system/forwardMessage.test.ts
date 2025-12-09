/**
 * Integration Test: forwardMessage Tool
 * Test chuyển tiếp tin nhắn đến người/nhóm khác
 */

import { describe, expect, test, mock } from 'bun:test';
import { forwardMessageTool } from '../../../src/modules/system/tools/social/forwardMessage.js';
import type { ToolContext } from '../../../src/shared/types/tools.types.js';

describe('forwardMessage Tool', () => {
  // Mock API
  const mockApi = {
    forwardMessage: mock(() => Promise.resolve({ success: true })),
  };

  const baseContext: ToolContext = {
    api: mockApi,
    threadId: 'test-thread-123',
    senderId: 'test-sender-456',
    senderName: 'Test User',
  };

  test('should have correct metadata', () => {
    expect(forwardMessageTool.name).toBe('forwardMessage');
    expect(forwardMessageTool.description).toContain('Chuyển tiếp');
    expect(forwardMessageTool.parameters.length).toBeGreaterThan(0);
  });

  test('should forward message to single user', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Hello, this is a forwarded message!',
        targetThreadIds: '123456789',
        targetType: 'user',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.recipients).toEqual(['123456789']);
    expect(result.data?.recipientCount).toBe(1);
    expect(result.data?.targetType).toBe('user');
  });

  test('should forward message to multiple users', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Broadcast message',
        targetThreadIds: '111,222,333',
        targetType: 'user',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.recipients).toEqual(['111', '222', '333']);
    expect(result.data?.recipientCount).toBe(3);
  });

  test('should forward message to group', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Group message',
        targetThreadIds: 'group-123',
        targetType: 'group',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.targetType).toBe('group');
  });

  test('should include reference when originalMsgId provided', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Forwarded with reference',
        targetThreadIds: '123',
        originalMsgId: 'msg-original-123',
        originalTimestamp: 1733580000000,
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    // API should be called with reference
    expect(mockApi.forwardMessage).toHaveBeenCalled();
  });

  test('should fail when message is empty', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: '',
        targetThreadIds: '123',
      },
      baseContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Thiếu nội dung');
  });

  test('should fail when targetThreadIds is empty', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Test message',
        targetThreadIds: '',
      },
      baseContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Thiếu ID');
  });

  test('should fail when more than 5 recipients', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Too many recipients',
        targetThreadIds: '1,2,3,4,5,6',
      },
      baseContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tối đa');
  });

  test('should default targetType to user', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Default type test',
        targetThreadIds: '123',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.targetType).toBe('user');
  });

  test('should handle API error gracefully', async () => {
    const errorApi = {
      forwardMessage: mock(() => Promise.reject(new Error('Network error'))),
    };

    const result = await forwardMessageTool.execute(
      {
        message: 'Test',
        targetThreadIds: '123',
      },
      { ...baseContext, api: errorApi },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lỗi chuyển tiếp');
  });

  test('should trim whitespace from thread IDs', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Trimmed IDs',
        targetThreadIds: ' 111 , 222 , 333 ',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.recipients).toEqual(['111', '222', '333']);
  });

  test('should filter empty IDs', async () => {
    const result = await forwardMessageTool.execute(
      {
        message: 'Filter empty',
        targetThreadIds: '111,,222,,,333',
      },
      baseContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.recipients).toEqual(['111', '222', '333']);
  });
});
