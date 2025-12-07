/**
 * Test: Context Builder
 */
import { describe, expect, it } from 'bun:test';
import {
  formatContextForPrompt,
  type EnvironmentContext,
} from '../../../src/modules/background-agent/context.builder.js';

describe('Context Builder', () => {
  describe('formatContextForPrompt()', () => {
    it('should format basic context', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date('2024-03-15T10:00:00'),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Ngữ cảnh môi trường');
      expect(result).toContain('Trạng thái online');
      expect(result).toContain('Số người đang online: 0');
    });

    it('should include online users', () => {
      const context: EnvironmentContext = {
        onlineUsers: [
          { userId: 'user1', status: 'online' },
          { userId: 'user2', status: 'online' },
        ],
        onlineCount: 2,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date(),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Số người đang online: 2');
      expect(result).toContain('user1');
      expect(result).toContain('user2');
    });

    it('should include joined groups', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [
          { groupId: 'g1', name: 'Nhóm Test 1', totalMember: 50 },
          { groupId: 'g2', name: 'Nhóm Test 2', totalMember: 100 },
        ],
        totalGroups: 2,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date(),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Nhóm bot tham gia (2 nhóm)');
      expect(result).toContain('Nhóm Test 1');
      expect(result).toContain('50 thành viên');
    });

    it('should include friends list', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [
          { userId: 'f1', displayName: 'Nguyễn Văn A', gender: 'Nam' },
          { userId: 'f2', displayName: 'Trần Thị B', gender: 'Nữ' },
        ],
        totalFriends: 2,
        relevantMemories: [],
        timestamp: new Date(),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Danh sách bạn bè (2 người)');
      expect(result).toContain('Nguyễn Văn A');
      expect(result).toContain('Nam');
    });

    it('should include target user info', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date(),
        targetUserInfo: {
          userId: 'target123',
          displayName: 'Target User',
          zaloName: 'target_zalo',
          gender: 0, // Nam
          avatar: 'http://avatar.jpg',
          birthday: '01/01/2000',
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Thông tin người nhận');
      expect(result).toContain('Target User');
      expect(result).toContain('Nam');
      expect(result).toContain('01/01/2000');
    });

    it('should include female gender', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date(),
        targetUserInfo: {
          userId: 'target123',
          displayName: 'Female User',
          zaloName: 'female_zalo',
          gender: 1, // Nữ
          avatar: 'http://avatar.jpg',
        },
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Nữ');
    });

    it('should include memories', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [
          'User likes coffee',
          'User birthday is March 15',
        ],
        timestamp: new Date(),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Ký ức liên quan');
      expect(result).toContain('User likes coffee');
      expect(result).toContain('User birthday is March 15');
    });

    it('should include timestamp', () => {
      const context: EnvironmentContext = {
        onlineUsers: [],
        onlineCount: 0,
        joinedGroups: [],
        totalGroups: 0,
        friends: [],
        totalFriends: 0,
        relevantMemories: [],
        timestamp: new Date('2024-03-15T10:30:00'),
      };

      const result = formatContextForPrompt(context);
      expect(result).toContain('Thời gian');
    });
  });
});
