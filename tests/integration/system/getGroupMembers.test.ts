/**
 * Integration Test: getGroupMembers Tool
 * Test chức năng lấy danh sách thành viên nhóm
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  getGroupMembersTool,
  groupMembersCache,
} from '../../../src/modules/system/tools/getGroupMembers.js';
import { mockToolContext } from '../setup.js';

// Mock API response cho group info
const mockGroupInfo = {
  gridInfoMap: {
    'test-group-123': {
      name: 'Test Group',
      creatorId: 'creator-001',
      adminIds: ['admin-001', 'admin-002'],
      currentMems: [
        { id: 'creator-001', dName: 'Creator User', zaloName: 'Creator' },
        { id: 'admin-001', dName: 'Admin One', zaloName: 'Admin1' },
        { id: 'admin-002', displayName: 'Admin Two' },
        { id: 'member-001', dName: 'Member One' },
        { id: 'member-002', zaloName: 'Member Two' },
      ],
    },
  },
};

// Mock API
const mockApi = {
  getGroupInfo: async (threadId: string) => {
    if (threadId === 'test-group-123') {
      return mockGroupInfo;
    }
    // Trả về empty cho non-group
    return { gridInfoMap: {} };
  },
};

describe('getGroupMembers Tool Integration', () => {
  beforeEach(() => {
    // Clear cache trước mỗi test
    groupMembersCache.clear();
  });

  test('getGroupMembers - lấy danh sách thành viên thành công', async () => {
    const context = {
      ...mockToolContext,
      api: mockApi,
      threadId: 'test-group-123',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.groupName).toBe('Test Group');
    expect(result.data.count).toBe(5);
    expect(result.data.members).toHaveLength(5);
    expect(result.data.hint).toContain('[mention:');
  });

  test('getGroupMembers - phân loại role đúng (Creator/Admin/Member)', async () => {
    const context = {
      ...mockToolContext,
      api: mockApi,
      threadId: 'test-group-123',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(true);

    const members = result.data.members;

    // Kiểm tra Creator
    const creator = members.find((m: any) => m.id === 'creator-001');
    expect(creator).toBeDefined();
    expect(creator.role).toBe('Creator');

    // Kiểm tra Admin
    const admin1 = members.find((m: any) => m.id === 'admin-001');
    expect(admin1).toBeDefined();
    expect(admin1.role).toBe('Admin');

    // Kiểm tra Member
    const member1 = members.find((m: any) => m.id === 'member-001');
    expect(member1).toBeDefined();
    expect(member1.role).toBe('Member');
  });

  test('getGroupMembers - lưu vào cache', async () => {
    const context = {
      ...mockToolContext,
      api: mockApi,
      threadId: 'test-group-123',
    };

    // Trước khi gọi, cache rỗng
    expect(groupMembersCache.has('test-group-123')).toBe(false);

    await getGroupMembersTool.execute({}, context);

    // Sau khi gọi, cache có dữ liệu
    expect(groupMembersCache.has('test-group-123')).toBe(true);
    expect(groupMembersCache.get('test-group-123')).toHaveLength(5);
  });

  test('getGroupMembers - trả về summary text', async () => {
    const context = {
      ...mockToolContext,
      api: mockApi,
      threadId: 'test-group-123',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.data.summary).toBeDefined();
    expect(result.data.summary).toContain('Creator User');
    expect(result.data.summary).toContain('[Creator]');
    expect(result.data.summary).toContain('[Admin]');
    expect(result.data.summary).toContain('[Member]');
  });

  test('getGroupMembers - lỗi khi không phải nhóm chat', async () => {
    const context = {
      ...mockToolContext,
      api: mockApi,
      threadId: 'not-a-group',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('không phải là nhóm chat');
  });

  test('getGroupMembers - lỗi khi API throw error', async () => {
    const errorApi = {
      getGroupInfo: async () => {
        throw new Error('Network error');
      },
    };

    const context = {
      ...mockToolContext,
      api: errorApi,
      threadId: 'test-group-123',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Lỗi lấy thành viên nhóm');
  });

  test('getGroupMembers - xử lý member không có tên', async () => {
    const apiWithNoName = {
      getGroupInfo: async () => ({
        gridInfoMap: {
          'test-group': {
            name: 'Group',
            creatorId: 'user-1',
            adminIds: [],
            currentMems: [{ id: 'user-1' }], // Không có dName, zaloName, displayName
          },
        },
      }),
    };

    const context = {
      ...mockToolContext,
      api: apiWithNoName,
      threadId: 'test-group',
    };

    const result = await getGroupMembersTool.execute({}, context);

    expect(result.success).toBe(true);
    expect(result.data.members[0].name).toBe('Không tên');
  });
});
