/**
 * Group Admin Tools - Quản trị nhóm Zalo
 * API: kick, block, add members, settings, admin roles, group link
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

// ═══════════════════════════════════════════════════
// MEMBER MANAGEMENT
// ═══════════════════════════════════════════════════

/**
 * Kick thành viên ra khỏi nhóm
 */
export const kickMemberTool: ToolDefinition = {
  name: 'kickMember',
  description:
    'Kick (mời ra) thành viên khỏi nhóm. Bot phải là Trưởng nhóm hoặc Phó nhóm. Chỉ hoạt động trong nhóm.',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của thành viên cần kick (lấy từ getGroupMembers)',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của thành viên cần kick' };
      }

      debugLog('TOOL:kickMember', `Kicking user ${userId} from group ${context.threadId}`);

      const result = await context.api.removeUserFromGroup(String(userId), context.threadId);
      logZaloAPI('tool:kickMember', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          userId,
          message: `Đã kick thành viên ${userId} ra khỏi nhóm`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:kickMember', `Error: ${error.message}`);
      return { success: false, error: `Lỗi kick thành viên: ${error.message}` };
    }
  },
};

/**
 * Chặn thành viên (kick và không cho vào lại)
 */
export const blockMemberTool: ToolDefinition = {
  name: 'blockMember',
  description:
    'Chặn thành viên (kick và không cho vào lại nhóm). Bot phải là Admin. Chỉ hoạt động trong nhóm.',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của thành viên cần chặn',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của thành viên cần chặn' };
      }

      debugLog('TOOL:blockMember', `Blocking user ${userId} from group ${context.threadId}`);

      const result = await context.api.addGroupBlockedMember(String(userId), context.threadId);
      logZaloAPI('tool:blockMember', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          userId,
          message: `Đã chặn thành viên ${userId}, họ không thể vào lại nhóm`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:blockMember', `Error: ${error.message}`);
      return { success: false, error: `Lỗi chặn thành viên: ${error.message}` };
    }
  },
};


/**
 * Thêm/mời người vào nhóm
 */
export const addMemberTool: ToolDefinition = {
  name: 'addMember',
  description: 'Thêm hoặc mời người vào nhóm. Cần userId của người muốn thêm.',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của người cần thêm vào nhóm',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của người cần thêm' };
      }

      debugLog('TOOL:addMember', `Adding user ${userId} to group ${context.threadId}`);

      const result = await context.api.addUserToGroup(String(userId), context.threadId);
      logZaloAPI('tool:addMember', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          userId,
          message: `Đã thêm/mời ${userId} vào nhóm`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:addMember', `Error: ${error.message}`);
      return { success: false, error: `Lỗi thêm thành viên: ${error.message}` };
    }
  },
};

/**
 * Lấy danh sách thành viên đang chờ duyệt
 */
export const getPendingMembersTool: ToolDefinition = {
  name: 'getPendingMembers',
  description:
    'Lấy danh sách thành viên đang chờ duyệt vào nhóm (khi nhóm bật chế độ phê duyệt). Bot phải là Admin.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      debugLog('TOOL:getPendingMembers', `Getting pending members for group ${context.threadId}`);

      const result = await context.api.getPendingGroupMembers(context.threadId);
      logZaloAPI('tool:getPendingMembers', { threadId: context.threadId }, result);

      const pendingList = result?.pendingMembers || result?.members || [];
      const summary = pendingList.length
        ? pendingList.map((m: any) => `- ${m.dName || m.displayName || 'Không tên'} (ID: ${m.id})`).join('\n')
        : 'Không có ai đang chờ duyệt';

      return {
        success: true,
        data: {
          count: pendingList.length,
          members: pendingList,
          summary,
          hint: 'Dùng reviewPendingMembers với danh sách userId để duyệt/từ chối',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getPendingMembers', `Error: ${error.message}`);
      return { success: false, error: `Lỗi lấy danh sách chờ duyệt: ${error.message}` };
    }
  },
};

/**
 * Duyệt hoặc từ chối thành viên đang chờ
 */
export const reviewPendingMembersTool: ToolDefinition = {
  name: 'reviewPendingMembers',
  description:
    'Duyệt hoặc từ chối thành viên đang chờ vào nhóm. Bot phải là Admin. Dùng getPendingMembers để lấy danh sách trước.',
  parameters: [
    {
      name: 'memberIds',
      type: 'object',
      description: 'Mảng ID các thành viên cần duyệt/từ chối (VD: ["uid1", "uid2"])',
      required: true,
    },
    {
      name: 'isApprove',
      type: 'boolean',
      description: 'true = Duyệt vào nhóm, false = Từ chối',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { memberIds, isApprove } = params;

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return { success: false, error: 'Cần ít nhất 1 userId trong memberIds' };
      }

      if (typeof isApprove !== 'boolean') {
        return { success: false, error: 'isApprove phải là true (duyệt) hoặc false (từ chối)' };
      }

      debugLog('TOOL:reviewPendingMembers', `Reviewing ${memberIds.length} members, approve=${isApprove}`);

      const payload = {
        members: memberIds.map(String),
        isApprove,
      };

      const result = await context.api.reviewPendingMemberRequest(payload, context.threadId);
      logZaloAPI('tool:reviewPendingMembers', { payload, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          memberIds,
          action: isApprove ? 'approved' : 'rejected',
          message: `Đã ${isApprove ? 'duyệt' : 'từ chối'} ${memberIds.length} thành viên`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:reviewPendingMembers', `Error: ${error.message}`);
      return { success: false, error: `Lỗi duyệt thành viên: ${error.message}` };
    }
  },
};


// ═══════════════════════════════════════════════════
// GROUP SETTINGS
// ═══════════════════════════════════════════════════

/**
 * Cập nhật cài đặt nhóm
 */
export const updateGroupSettingsTool: ToolDefinition = {
  name: 'updateGroupSettings',
  description:
    'Thay đổi cài đặt quyền hạn trong nhóm. Bot phải là Admin. Các option: blockName (chặn đổi tên/ảnh), signAdminMsg (đánh dấu tin admin), joinAppr (phê duyệt thành viên), lockSendMsg (chỉ admin chat), lockCreatePost (chặn tạo ghi chú), lockCreatePoll (chặn tạo bình chọn).',
  parameters: [
    {
      name: 'blockName',
      type: 'boolean',
      description: 'Chặn thành viên đổi tên/ảnh nhóm (chỉ admin được đổi)',
      required: false,
    },
    {
      name: 'signAdminMsg',
      type: 'boolean',
      description: 'Đánh dấu tin nhắn của Admin/Trưởng nhóm',
      required: false,
    },
    {
      name: 'joinAppr',
      type: 'boolean',
      description: 'Bật phê duyệt thành viên mới (chế độ riêng tư)',
      required: false,
    },
    {
      name: 'lockSendMsg',
      type: 'boolean',
      description: 'Tắt chat (chỉ Admin được nhắn tin) - Khóa mõm nhóm',
      required: false,
    },
    {
      name: 'lockCreatePost',
      type: 'boolean',
      description: 'Chặn thành viên tạo ghi chú/ghim',
      required: false,
    },
    {
      name: 'lockCreatePoll',
      type: 'boolean',
      description: 'Chặn thành viên tạo bình chọn',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const options: Record<string, boolean> = {};
      const settingNames: string[] = [];

      // Chỉ thêm các option được truyền vào
      if (typeof params.blockName === 'boolean') {
        options.blockName = params.blockName;
        settingNames.push(`blockName=${params.blockName}`);
      }
      if (typeof params.signAdminMsg === 'boolean') {
        options.signAdminMsg = params.signAdminMsg;
        settingNames.push(`signAdminMsg=${params.signAdminMsg}`);
      }
      if (typeof params.joinAppr === 'boolean') {
        options.joinAppr = params.joinAppr;
        settingNames.push(`joinAppr=${params.joinAppr}`);
      }
      if (typeof params.lockSendMsg === 'boolean') {
        options.lockSendMsg = params.lockSendMsg;
        settingNames.push(`lockSendMsg=${params.lockSendMsg}`);
      }
      if (typeof params.lockCreatePost === 'boolean') {
        options.lockCreatePost = params.lockCreatePost;
        settingNames.push(`lockCreatePost=${params.lockCreatePost}`);
      }
      if (typeof params.lockCreatePoll === 'boolean') {
        options.lockCreatePoll = params.lockCreatePoll;
        settingNames.push(`lockCreatePoll=${params.lockCreatePoll}`);
      }

      if (Object.keys(options).length === 0) {
        return { success: false, error: 'Cần ít nhất 1 setting để cập nhật' };
      }

      debugLog('TOOL:updateGroupSettings', `Updating settings: ${settingNames.join(', ')}`);

      const result = await context.api.updateGroupSettings(options, context.threadId);
      logZaloAPI('tool:updateGroupSettings', { options, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          settings: options,
          message: `Đã cập nhật cài đặt nhóm: ${settingNames.join(', ')}`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:updateGroupSettings', `Error: ${error.message}`);
      return { success: false, error: `Lỗi cập nhật cài đặt: ${error.message}` };
    }
  },
};

/**
 * Đổi tên nhóm
 */
export const changeGroupNameTool: ToolDefinition = {
  name: 'changeGroupName',
  description: 'Đổi tên nhóm. Bot phải có quyền (Admin hoặc nhóm cho phép thành viên đổi tên).',
  parameters: [
    {
      name: 'newName',
      type: 'string',
      description: 'Tên mới của nhóm',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { newName } = params;

      if (!newName || typeof newName !== 'string') {
        return { success: false, error: 'Thiếu tên mới (newName)' };
      }

      debugLog('TOOL:changeGroupName', `Changing group name to: ${newName}`);

      const result = await context.api.changeGroupName(newName, context.threadId);
      logZaloAPI('tool:changeGroupName', { newName, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          newName,
          message: `Đã đổi tên nhóm thành "${newName}"`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:changeGroupName', `Error: ${error.message}`);
      return { success: false, error: `Lỗi đổi tên nhóm: ${error.message}` };
    }
  },
};

/**
 * Đổi ảnh đại diện nhóm
 */
export const changeGroupAvatarTool: ToolDefinition = {
  name: 'changeGroupAvatar',
  description:
    'Đổi ảnh đại diện nhóm. Bot phải có quyền. Cần đường dẫn file ảnh trên máy hoặc URL.',
  parameters: [
    {
      name: 'filePath',
      type: 'string',
      description: 'Đường dẫn file ảnh (VD: "./avatar.jpg") hoặc URL ảnh',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { filePath } = params;

      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Thiếu đường dẫn file ảnh (filePath)' };
      }

      debugLog('TOOL:changeGroupAvatar', `Changing group avatar: ${filePath}`);

      const result = await context.api.changeGroupAvatar(filePath, context.threadId);
      logZaloAPI('tool:changeGroupAvatar', { filePath, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          filePath,
          message: 'Đã đổi ảnh đại diện nhóm',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:changeGroupAvatar', `Error: ${error.message}`);
      return { success: false, error: `Lỗi đổi ảnh nhóm: ${error.message}` };
    }
  },
};


// ═══════════════════════════════════════════════════
// ADMIN ROLES
// ═══════════════════════════════════════════════════

/**
 * Bổ nhiệm Phó nhóm (Admin)
 */
export const addGroupDeputyTool: ToolDefinition = {
  name: 'addGroupDeputy',
  description:
    'Bổ nhiệm thành viên làm Phó nhóm (Admin). Bot phải là Trưởng nhóm (Owner).',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của thành viên cần bổ nhiệm làm Phó nhóm',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của thành viên cần bổ nhiệm' };
      }

      debugLog('TOOL:addGroupDeputy', `Adding deputy: ${userId}`);

      const result = await context.api.addGroupDeputy(String(userId), context.threadId);
      logZaloAPI('tool:addGroupDeputy', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          userId,
          message: `Đã bổ nhiệm ${userId} làm Phó nhóm`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:addGroupDeputy', `Error: ${error.message}`);
      return { success: false, error: `Lỗi bổ nhiệm Phó nhóm: ${error.message}` };
    }
  },
};

/**
 * Cách chức Phó nhóm
 */
export const removeGroupDeputyTool: ToolDefinition = {
  name: 'removeGroupDeputy',
  description:
    'Cách chức Phó nhóm (xuống làm thành viên thường). Bot phải là Trưởng nhóm (Owner).',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của Phó nhóm cần cách chức',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của Phó nhóm cần cách chức' };
      }

      debugLog('TOOL:removeGroupDeputy', `Removing deputy: ${userId}`);

      const result = await context.api.removeGroupDeputy(String(userId), context.threadId);
      logZaloAPI('tool:removeGroupDeputy', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          userId,
          message: `Đã cách chức Phó nhóm của ${userId}`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:removeGroupDeputy', `Error: ${error.message}`);
      return { success: false, error: `Lỗi cách chức Phó nhóm: ${error.message}` };
    }
  },
};

/**
 * Chuyển quyền Trưởng nhóm
 */
export const changeGroupOwnerTool: ToolDefinition = {
  name: 'changeGroupOwner',
  description:
    '⚠️ CẢNH BÁO: Chuyển quyền Trưởng nhóm (Owner) cho người khác. Sau khi chuyển, Bot sẽ mất quyền tối cao. Bot phải là Trưởng nhóm hiện tại.',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của người sẽ nhận quyền Trưởng nhóm',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId } = params;

      if (!userId) {
        return { success: false, error: 'Thiếu userId của người nhận quyền Trưởng nhóm' };
      }

      debugLog('TOOL:changeGroupOwner', `Transferring ownership to: ${userId}`);

      const result = await context.api.changeGroupOwner(String(userId), context.threadId);
      logZaloAPI('tool:changeGroupOwner', { userId, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          newOwnerId: userId,
          message: `Đã chuyển quyền Trưởng nhóm cho ${userId}. Bot không còn là Owner.`,
          warning: 'Bot đã mất quyền Trưởng nhóm!',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:changeGroupOwner', `Error: ${error.message}`);
      return { success: false, error: `Lỗi chuyển quyền Trưởng nhóm: ${error.message}` };
    }
  },
};


// ═══════════════════════════════════════════════════
// GROUP LINK MANAGEMENT
// ═══════════════════════════════════════════════════

/**
 * Bật link tham gia nhóm
 */
export const enableGroupLinkTool: ToolDefinition = {
  name: 'enableGroupLink',
  description:
    'Bật link tham gia nhóm (để người lạ có thể join qua link). Bot phải là Admin.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      debugLog('TOOL:enableGroupLink', `Enabling group link for ${context.threadId}`);

      const result = await context.api.enableGroupLink(context.threadId);
      logZaloAPI('tool:enableGroupLink', { threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          enabled: true,
          link: result?.link || result?.groupLink,
          message: 'Đã bật link tham gia nhóm',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:enableGroupLink', `Error: ${error.message}`);
      return { success: false, error: `Lỗi bật link nhóm: ${error.message}` };
    }
  },
};

/**
 * Tắt link tham gia nhóm
 */
export const disableGroupLinkTool: ToolDefinition = {
  name: 'disableGroupLink',
  description:
    'Tắt/vô hiệu hóa link tham gia nhóm (bảo mật). Bot phải là Admin.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      debugLog('TOOL:disableGroupLink', `Disabling group link for ${context.threadId}`);

      const result = await context.api.disableGroupLink(context.threadId);
      logZaloAPI('tool:disableGroupLink', { threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          enabled: false,
          message: 'Đã tắt link tham gia nhóm',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:disableGroupLink', `Error: ${error.message}`);
      return { success: false, error: `Lỗi tắt link nhóm: ${error.message}` };
    }
  },
};

/**
 * Lấy thông tin nhóm từ link
 */
export const getGroupLinkInfoTool: ToolDefinition = {
  name: 'getGroupLinkInfo',
  description:
    'Lấy thông tin nhóm từ đường link chia sẻ (zalo.me/g/...). Không cần quyền admin.',
  parameters: [
    {
      name: 'link',
      type: 'string',
      description: 'Link nhóm Zalo (VD: https://zalo.me/g/abc123)',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { link } = params;

      if (!link || typeof link !== 'string') {
        return { success: false, error: 'Thiếu link nhóm' };
      }

      debugLog('TOOL:getGroupLinkInfo', `Getting info for link: ${link}`);

      const result = await context.api.getGroupLinkInfo(link);
      logZaloAPI('tool:getGroupLinkInfo', { link }, result);

      return {
        success: true,
        data: {
          groupId: result?.groupId || result?.id,
          groupName: result?.name || result?.groupName,
          memberCount: result?.totalMember || result?.memberCount,
          description: result?.desc || result?.description,
          raw: result,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getGroupLinkInfo', `Error: ${error.message}`);
      return { success: false, error: `Lỗi lấy thông tin link: ${error.message}` };
    }
  },
};
