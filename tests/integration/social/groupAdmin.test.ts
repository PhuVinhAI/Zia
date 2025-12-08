/**
 * Integration Test: Group Admin Tools
 * Test chức năng quản trị nhóm Zalo
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  getGroupInfoTool,
  kickMemberTool,
  blockMemberTool,
  addMemberTool,
  getPendingMembersTool,
  reviewPendingMembersTool,
  updateGroupSettingsTool,
  changeGroupNameTool,
  changeGroupAvatarTool,
  addGroupDeputyTool,
  removeGroupDeputyTool,
  changeGroupOwnerTool,
  enableGroupLinkTool,
  disableGroupLinkTool,
  getGroupLinkInfoTool,
} from '../../../src/modules/social/tools/groupAdmin.js';
import { mockToolContext } from '../setup.js';

// Mock data
const mockGroupId = 'group-123456';
const mockUserId = 'user-789';
const mockCreatorId = 'creator-001';
const mockAdminIds = ['admin-001', 'admin-002'];

const mockGroupInfo = {
  gridInfoMap: {
    [mockGroupId]: {
      name: 'Test Group',
      creatorId: mockCreatorId,
      adminIds: mockAdminIds,
      memberIds: ['user-1', 'user-2', 'user-3', mockCreatorId, ...mockAdminIds],
      currentMems: [
        { id: 'user-1', dName: 'User 1' },
        { id: 'user-2', dName: 'User 2' },
        { id: 'user-3', dName: 'User 3' },
      ],
      setting: {
        blockName: false,
        signAdminMsg: true,
        joinAppr: false,
        lockSendMsg: false,
        lockCreatePost: false,
        lockCreatePoll: false,
      },
      desc: 'Test group description',
      avt: 'https://example.com/avatar.jpg',
      link: 'https://zalo.me/g/abc123',
    },
  },
};

const mockPendingMembers = {
  pendingMembers: [
    { id: 'pending-1', dName: 'Pending User 1' },
    { id: 'pending-2', dName: 'Pending User 2' },
  ],
};

// Mock API
const createMockApi = () => ({
  // Group Info
  getGroupInfo: async (groupId: string) => {
    if (groupId === mockGroupId) return mockGroupInfo;
    throw new Error('Group not found');
  },

  // Member Management
  removeUserFromGroup: async (userId: string, groupId: string) => ({
    success: true,
    userId,
    groupId,
  }),
  addGroupBlockedMember: async (userId: string, groupId: string) => ({
    success: true,
    userId,
    groupId,
  }),
  addUserToGroup: async (userId: string, groupId: string) => ({
    success: true,
    userId,
    groupId,
  }),
  getPendingGroupMembers: async (groupId: string) => mockPendingMembers,
  reviewPendingMemberRequest: async (payload: any, groupId: string) => ({
    success: true,
    ...payload,
  }),

  // Group Settings
  updateGroupSettings: async (options: any, groupId: string) => ({
    success: true,
    settings: options,
  }),
  changeGroupName: async (newName: string, groupId: string) => ({
    success: true,
    name: newName,
  }),
  changeGroupAvatar: async (filePath: string, groupId: string) => ({
    success: true,
    avatar: filePath,
  }),

  // Admin Roles
  addGroupDeputy: async (userId: string, groupId: string) => ({
    success: true,
    userId,
  }),
  removeGroupDeputy: async (userId: string, groupId: string) => ({
    success: true,
    userId,
  }),
  changeGroupOwner: async (userId: string, groupId: string) => ({
    success: true,
    newOwnerId: userId,
  }),

  // Group Link
  enableGroupLink: async (groupId: string) => ({
    success: true,
    link: 'https://zalo.me/g/newlink123',
  }),
  disableGroupLink: async (groupId: string) => ({
    success: true,
  }),
  getGroupLinkInfo: async (link: string) => ({
    groupId: mockGroupId,
    name: 'Test Group',
    totalMember: 50,
    desc: 'Group from link',
  }),
});

describe('Group Admin Tools Integration', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    mockApi = createMockApi();
  });


  // ═══════════════════════════════════════════════════
  // GET GROUP INFO
  // ═══════════════════════════════════════════════════

  describe('getGroupInfo', () => {
    test('lấy thông tin nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await getGroupInfoTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data.groupId).toBe(mockGroupId);
      expect(result.data.name).toBe('Test Group');
      expect(result.data.creatorId).toBe(mockCreatorId);
      expect(result.data.adminIds).toEqual(mockAdminIds);
      expect(result.data.memberCount).toBeGreaterThan(0);
      expect(result.data.settings).toBeDefined();
      expect(result.data.settingsSummary).toContain('Chặn đổi tên');
      expect(result.data.hint).toContain('getGroupMembers');
    });

    test('lỗi khi không tìm thấy nhóm', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: 'invalid-group' };

      const result = await getGroupInfoTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy thông tin nhóm');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        getGroupInfo: async () => {
          throw new Error('Network error');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await getGroupInfoTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy thông tin nhóm');
    });
  });

  // ═══════════════════════════════════════════════════
  // KICK MEMBER
  // ═══════════════════════════════════════════════════

  describe('kickMember', () => {
    test('kick thành viên thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await kickMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.message).toContain('kick');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await kickMemberTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        removeUserFromGroup: async () => {
          throw new Error('Permission denied');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await kickMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi kick');
    });
  });

  // ═══════════════════════════════════════════════════
  // BLOCK MEMBER
  // ═══════════════════════════════════════════════════

  describe('blockMember', () => {
    test('chặn thành viên thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await blockMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.message).toContain('chặn');
      expect(result.data.message).toContain('không thể vào lại');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await blockMemberTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        addGroupBlockedMember: async () => {
          throw new Error('Not admin');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await blockMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi chặn');
    });
  });

  // ═══════════════════════════════════════════════════
  // ADD MEMBER
  // ═══════════════════════════════════════════════════

  describe('addMember', () => {
    test('thêm thành viên thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await addMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.message).toContain('thêm');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await addMemberTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        addUserToGroup: async () => {
          throw new Error('User blocked');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await addMemberTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi thêm');
    });
  });


  // ═══════════════════════════════════════════════════
  // GET PENDING MEMBERS
  // ═══════════════════════════════════════════════════

  describe('getPendingMembers', () => {
    test('lấy danh sách chờ duyệt thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await getPendingMembersTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.members).toHaveLength(2);
      expect(result.data.summary).toContain('Pending User 1');
      expect(result.data.hint).toContain('reviewPendingMembers');
    });

    test('trả về thông báo khi không có ai chờ', async () => {
      const emptyApi = {
        getPendingGroupMembers: async () => ({ pendingMembers: [] }),
      };
      const context = { ...mockToolContext, api: emptyApi, threadId: mockGroupId };

      const result = await getPendingMembersTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.summary).toContain('Không có ai');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        getPendingGroupMembers: async () => {
          throw new Error('Not admin');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await getPendingMembersTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy danh sách');
    });
  });

  // ═══════════════════════════════════════════════════
  // REVIEW PENDING MEMBERS
  // ═══════════════════════════════════════════════════

  describe('reviewPendingMembers', () => {
    test('duyệt thành viên thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await reviewPendingMembersTool.execute(
        {
          memberIds: ['pending-1', 'pending-2'],
          isApprove: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.memberIds).toEqual(['pending-1', 'pending-2']);
      expect(result.data.action).toBe('approved');
      expect(result.data.message).toContain('duyệt');
    });

    test('từ chối thành viên thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await reviewPendingMembersTool.execute(
        {
          memberIds: ['pending-1'],
          isApprove: false,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('rejected');
      expect(result.data.message).toContain('từ chối');
    });

    test('lỗi khi memberIds rỗng', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await reviewPendingMembersTool.execute(
        {
          memberIds: [],
          isApprove: true,
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('lỗi khi thiếu isApprove', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await reviewPendingMembersTool.execute(
        {
          memberIds: ['pending-1'],
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('isApprove');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        reviewPendingMemberRequest: async () => {
          throw new Error('Permission denied');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await reviewPendingMembersTool.execute(
        {
          memberIds: ['pending-1'],
          isApprove: true,
        },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi duyệt');
    });
  });

  // ═══════════════════════════════════════════════════
  // UPDATE GROUP SETTINGS
  // ═══════════════════════════════════════════════════

  describe('updateGroupSettings', () => {
    test('cập nhật lockSendMsg thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await updateGroupSettingsTool.execute({ lockSendMsg: true }, context);

      expect(result.success).toBe(true);
      expect(result.data.settings.lockSendMsg).toBe(true);
      expect(result.data.message).toContain('lockSendMsg=true');
    });

    test('cập nhật nhiều settings cùng lúc', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await updateGroupSettingsTool.execute(
        {
          blockName: true,
          joinAppr: true,
          lockCreatePoll: true,
        },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.settings.blockName).toBe(true);
      expect(result.data.settings.joinAppr).toBe(true);
      expect(result.data.settings.lockCreatePoll).toBe(true);
      expect(result.data.message).toContain('blockName');
      expect(result.data.message).toContain('joinAppr');
    });

    test('lỗi khi không có setting nào', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await updateGroupSettingsTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ít nhất 1 setting');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        updateGroupSettings: async () => {
          throw new Error('Not admin');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await updateGroupSettingsTool.execute({ lockSendMsg: true }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi cập nhật');
    });
  });

  // ═══════════════════════════════════════════════════
  // CHANGE GROUP NAME
  // ═══════════════════════════════════════════════════

  describe('changeGroupName', () => {
    test('đổi tên nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupNameTool.execute({ newName: 'New Group Name' }, context);

      expect(result.success).toBe(true);
      expect(result.data.newName).toBe('New Group Name');
      expect(result.data.message).toContain('đổi tên');
    });

    test('lỗi khi thiếu newName', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupNameTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('newName');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        changeGroupName: async () => {
          throw new Error('Name blocked');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await changeGroupNameTool.execute({ newName: 'Test' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi đổi tên');
    });
  });

  // ═══════════════════════════════════════════════════
  // CHANGE GROUP AVATAR
  // ═══════════════════════════════════════════════════

  describe('changeGroupAvatar', () => {
    test('đổi ảnh nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupAvatarTool.execute({ filePath: './avatar.jpg' }, context);

      expect(result.success).toBe(true);
      expect(result.data.filePath).toBe('./avatar.jpg');
      expect(result.data.message).toContain('đổi ảnh');
    });

    test('lỗi khi thiếu filePath', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupAvatarTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('filePath');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        changeGroupAvatar: async () => {
          throw new Error('File not found');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await changeGroupAvatarTool.execute({ filePath: './invalid.jpg' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi đổi ảnh');
    });
  });


  // ═══════════════════════════════════════════════════
  // ADD GROUP DEPUTY
  // ═══════════════════════════════════════════════════

  describe('addGroupDeputy', () => {
    test('bổ nhiệm phó nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await addGroupDeputyTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(mockUserId);
      expect(result.data.message).toContain('Phó nhóm');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await addGroupDeputyTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        addGroupDeputy: async () => {
          throw new Error('Not owner');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await addGroupDeputyTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi bổ nhiệm');
    });
  });

  // ═══════════════════════════════════════════════════
  // REMOVE GROUP DEPUTY
  // ═══════════════════════════════════════════════════

  describe('removeGroupDeputy', () => {
    test('cách chức phó nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await removeGroupDeputyTool.execute({ userId: 'admin-001' }, context);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('admin-001');
      expect(result.data.message).toContain('cách chức');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await removeGroupDeputyTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        removeGroupDeputy: async () => {
          throw new Error('Not owner');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await removeGroupDeputyTool.execute({ userId: 'admin-001' }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi cách chức');
    });
  });

  // ═══════════════════════════════════════════════════
  // CHANGE GROUP OWNER
  // ═══════════════════════════════════════════════════

  describe('changeGroupOwner', () => {
    test('chuyển quyền trưởng nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupOwnerTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(true);
      expect(result.data.newOwnerId).toBe(mockUserId);
      expect(result.data.message).toContain('chuyển quyền');
      expect(result.data.warning).toContain('mất quyền');
    });

    test('lỗi khi thiếu userId', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await changeGroupOwnerTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('userId');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        changeGroupOwner: async () => {
          throw new Error('Not owner');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await changeGroupOwnerTool.execute({ userId: mockUserId }, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi chuyển quyền');
    });
  });

  // ═══════════════════════════════════════════════════
  // ENABLE GROUP LINK
  // ═══════════════════════════════════════════════════

  describe('enableGroupLink', () => {
    test('bật link nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await enableGroupLinkTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(true);
      expect(result.data.link).toContain('zalo.me');
      expect(result.data.message).toContain('bật link');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        enableGroupLink: async () => {
          throw new Error('Not admin');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await enableGroupLinkTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi bật link');
    });
  });

  // ═══════════════════════════════════════════════════
  // DISABLE GROUP LINK
  // ═══════════════════════════════════════════════════

  describe('disableGroupLink', () => {
    test('tắt link nhóm thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await disableGroupLinkTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data.enabled).toBe(false);
      expect(result.data.message).toContain('tắt link');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        disableGroupLink: async () => {
          throw new Error('Not admin');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await disableGroupLinkTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi tắt link');
    });
  });

  // ═══════════════════════════════════════════════════
  // GET GROUP LINK INFO
  // ═══════════════════════════════════════════════════

  describe('getGroupLinkInfo', () => {
    test('lấy thông tin từ link thành công', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await getGroupLinkInfoTool.execute(
        { link: 'https://zalo.me/g/abc123' },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data.groupId).toBe(mockGroupId);
      expect(result.data.groupName).toBe('Test Group');
      expect(result.data.memberCount).toBe(50);
    });

    test('lỗi khi thiếu link', async () => {
      const context = { ...mockToolContext, api: mockApi, threadId: mockGroupId };

      const result = await getGroupLinkInfoTool.execute({}, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('link');
    });

    test('xử lý API error', async () => {
      const errorApi = {
        getGroupLinkInfo: async () => {
          throw new Error('Invalid link');
        },
      };
      const context = { ...mockToolContext, api: errorApi, threadId: mockGroupId };

      const result = await getGroupLinkInfoTool.execute(
        { link: 'https://zalo.me/g/invalid' },
        context,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lỗi lấy thông tin');
    });
  });
});
