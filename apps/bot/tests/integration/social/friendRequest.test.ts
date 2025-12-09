/**
 * Integration Test: Friend Request Tools
 * Test chức năng tìm người và gửi lời mời kết bạn
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  findUserByPhoneTool,
  sendFriendRequestTool,
} from '../../../src/modules/social/tools/friendRequest.js';
import { mockToolContext } from '../setup.js';

// Mock data
const mockPhoneNumber = '0912345678';
const mockUserId = 'user-123456789';

const mockUserInfo = {
  uid: mockUserId,
  display_name: 'Test User',
  zalo_name: 'testuser',
  avatar: 'https://example.com/avatar.jpg',
  gender: 0, // Nam
  sdob: '01/01',
  status: 'Hello World',
};

// Mock API
const createMockApi = () => ({
  findUser: async (phoneNumber: string) => {
    if (phoneNumber === mockPhoneNumber || phoneNumber === '84912345678') {
      return mockUserInfo;
    }
    if (phoneNumber === '0000000000') {
      return null; // User chặn tìm kiếm
    }
    throw new Error('User not found');
  },

  sendFriendRequest: async (msg: string, userId: string) => {
    if (userId === mockUserId) {
      return null; // Success
    }
    if (userId === 'already-friend') {
      const error: any = new Error('Already friends');
      error.code = 225;
      throw error;
    }
    if (userId === 'blocked-stranger') {
      const error: any = new Error('Blocked stranger');
      error.code = 215;
      throw error;
    }
    if (userId === 'pending-request') {
      const error: any = new Error('Already sent');
      error.code = 214;
      throw error;
    }
    if (userId === 'need-accept') {
      const error: any = new Error('Need to accept');
      error.code = 222;
      throw error;
    }
    throw new Error('Unknown error');
  },
});

describe('Friend Request Tools Integration', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    mockApi = createMockApi();
  });

  // ═══════════════════════════════════════════════════
  // FIND USER BY PHONE
  // ═══════════════════════════════════════════════════

  describe('findUserByPhone', () => {
    test('tìm người dùng thành công', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await findUserByPhoneTool.execute(
        { phoneNumber: mockPhoneNumber },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.uid).toBe(mockUserId);
      expect(result.data.displayName).toBe('Test User');
      expect(result.data.zaloName).toBe('testuser');
      expect(result.data.avatar).toContain('example.com');
      expect(result.data.gender).toBe('Nam');
      expect(result.data.hint).toContain('sendFriendRequest');
    });

    test('tìm với số điện thoại có đầu 84', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await findUserByPhoneTool.execute(
        { phoneNumber: '84912345678' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.uid).toBe(mockUserId);
    });

    test('lỗi khi thiếu phoneNumber', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await findUserByPhoneTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('phoneNumber');
    });

    test('lỗi khi số điện thoại không hợp lệ', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await findUserByPhoneTool.execute(
        { phoneNumber: '123' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('không hợp lệ');
    });

    test('lỗi khi người dùng chặn tìm kiếm', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await findUserByPhoneTool.execute(
        { phoneNumber: '0000000000' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('chặn tìm kiếm');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        findUser: async () => {
          throw new Error('Network error');
        },
      };
      const context = { ...mockToolContext, api: errorApi };

      const result = await findUserByPhoneTool.execute(
        { phoneNumber: mockPhoneNumber },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi tìm người dùng');
    });
  });

  // ═══════════════════════════════════════════════════
  // SEND FRIEND REQUEST
  // ═══════════════════════════════════════════════════

  describe('sendFriendRequest', () => {
    test('gửi lời mời kết bạn thành công', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: mockUserId, message: 'Xin chào!' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.message).toBe('Xin chào!');
      expect(result.data.result).toContain('thành công');
    });

    test('gửi với message mặc định', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: mockUserId },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('kết bạn');
    });

    test('cắt message quá 150 ký tự', async () => {
      const context = { ...mockToolContext, api: mockApi };
      const longMessage = 'A'.repeat(200);

      const result = await sendFriendRequestTool.execute(
        { userId: mockUserId, message: longMessage },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.message.length).toBe(150);
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('lỗi 225: đã là bạn bè', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: 'already-friend' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('bạn bè');
      expect(result.data?.errorCode).toBe(225);
    });

    test('lỗi 215: người này chặn người lạ', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: 'blocked-stranger' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('chặn');
      expect(result.data?.errorCode).toBe(215);
    });

    test('lỗi 214: đã gửi lời mời rồi', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: 'pending-request' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('đã gửi');
      expect(result.data?.errorCode).toBe(214);
    });

    test('lỗi 222: cần accept thay vì send', async () => {
      const context = { ...mockToolContext, api: mockApi };

      const result = await sendFriendRequestTool.execute(
        { userId: 'need-accept' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('accept');
      expect(result.data?.errorCode).toBe(222);
    });

    test('xử lý API error không xác định', async () => {
      const errorApi = {
        sendFriendRequest: async () => {
          throw new Error('Unknown error');
        },
      };
      const context = { ...mockToolContext, api: errorApi };

      const result = await sendFriendRequestTool.execute(
        { userId: mockUserId },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi gửi kết bạn');
    });
  });
});
