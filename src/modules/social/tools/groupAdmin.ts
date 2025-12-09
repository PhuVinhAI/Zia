/**
 * Group Admin Tools - Quản trị nhóm Zalo
 * API: kick, block, add members, settings, admin roles, group link
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { fetchImageAsBuffer } from '../../../shared/utils/httpClient.js';
import { getThreadType } from '../../../shared/utils/message/messageSender.js';

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Kiểm tra xem context có phải là nhóm chat không
 * ThreadType: 0 = User (1-1), 1 = Group
 * Nếu không chắc chắn, trả về true để cho phép thử gọi API
 */
function isGroupContext(threadId: string): boolean {
  const threadType = getThreadType(threadId);
  // ThreadType.User = 0, ThreadType.Group = 1
  return threadType === 1;
}

/**
 * Trả về lỗi khi tool được gọi trong ngữ cảnh 1-1 (không phải nhóm)
 */
function notGroupError(): ToolResult {
  return {
    success: false,
    error:
      'Tool này chỉ hoạt động trong nhóm chat. Bạn đang chat 1-1 với bot. Hãy sử dụng tool này trong một nhóm cụ thể hoặc cung cấp Group ID.',
  };
}

// ═══════════════════════════════════════════════════
// GROUP INFO
// ═══════════════════════════════════════════════════

/**
 * Lấy thông tin chi tiết nhóm
 */
export const getGroupInfoTool: ToolDefinition = {
  name: 'getGroupInfo',
  description:
    'Lấy toàn bộ thông tin chi tiết về nhóm: tên, người tạo (creatorId), danh sách admin (adminIds), cài đặt nhóm (setting), số thành viên. Dùng trước khi thực hiện các tác vụ quản trị.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      debugLog('TOOL:getGroupInfo', `Getting group info for ${context.threadId}`);

      const groupInfo = await context.api.getGroupInfo(context.threadId);
      logZaloAPI('tool:getGroupInfo', { threadId: context.threadId }, groupInfo);

      const info = groupInfo?.gridInfoMap?.[context.threadId];

      if (!info) {
        return {
          success: false,
          error: 'Không tìm thấy thông tin nhóm. Có thể đây không phải là nhóm chat.',
        };
      }

      // Format admin list
      const adminIds = info.adminIds || [];
      const creatorId = info.creatorId;
      const memberCount = info.memberIds?.length || info.currentMems?.length || 0;

      // Format settings
      const settings = info.setting || {};
      const settingsSummary = [
        `- Chặn đổi tên/ảnh: ${settings.blockName ? 'Bật' : 'Tắt'}`,
        `- Đánh dấu tin admin: ${settings.signAdminMsg ? 'Bật' : 'Tắt'}`,
        `- Phê duyệt thành viên: ${settings.joinAppr ? 'Bật' : 'Tắt'}`,
        `- Khóa chat (chỉ admin): ${settings.lockSendMsg ? 'Bật' : 'Tắt'}`,
        `- Chặn tạo ghi chú: ${settings.lockCreatePost ? 'Bật' : 'Tắt'}`,
        `- Chặn tạo bình chọn: ${settings.lockCreatePoll ? 'Bật' : 'Tắt'}`,
      ].join('\n');

      return {
        success: true,
        data: {
          groupId: context.threadId,
          name: info.name || 'Không tên',
          creatorId,
          adminIds,
          memberCount,
          settings,
          settingsSummary,
          description: info.desc || '',
          avatar: info.avt || info.avatar,
          link: info.link,
          raw: info,
          hint: 'Dùng creatorId và adminIds để biết ai có quyền quản trị. Dùng getGroupMembers để lấy danh sách thành viên chi tiết.',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getGroupInfo', `Error: ${error.message}`);
      return { success: false, error: `Lỗi lấy thông tin nhóm: ${error.message}` };
    }
  },
};

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
      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(context.threadId)) {
        return notGroupError();
      }

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
      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(context.threadId)) {
        return notGroupError();
      }

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

      // API Zalo trả về { time, users: [{ uid, dpn, avatar, user_submit }] }
      // Cần map đúng các trường từ response
      const rawUsers = result?.users || result?.pendingMembers || result?.members || [];

      // Map sang format chuẩn để AI và reviewPendingMembers sử dụng
      const pendingList = rawUsers.map((user: any) => ({
        id: user.uid || user.id, // uid từ Zalo API, fallback id
        name: user.dpn || user.dName || user.displayName || 'Không tên', // dpn = display name từ Zalo
        avatar: user.avatar,
      }));

      const summary = pendingList.length
        ? pendingList.map((m: any) => `- ${m.name} (ID: ${m.id})`).join('\n')
        : 'Không có ai đang chờ duyệt';

      return {
        success: true,
        data: {
          count: pendingList.length,
          members: pendingList,
          summary,
          hint:
            pendingList.length > 0
              ? `Dùng reviewPendingMembers với memberIds=[${pendingList.map((m: any) => `"${m.id}"`).join(', ')}] và isApprove=true để duyệt`
              : 'Không có thành viên nào đang chờ duyệt',
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

      debugLog(
        'TOOL:reviewPendingMembers',
        `Reviewing ${memberIds.length} members, approve=${isApprove}`,
      );

      const payload = {
        members: memberIds.map(String),
        isApprove,
      };

      const result = await context.api.reviewPendingMemberRequest(payload, context.threadId);
      logZaloAPI('tool:reviewPendingMembers', { payload, threadId: context.threadId }, result);

      // Parse response status cho từng member
      // Status codes: 0 = SUCCESS, 170 = NOT_IN_PENDING_LIST, 178 = ALREADY_IN_GROUP, 166 = INSUFFICIENT_PERMISSION
      const statusMessages: Record<number, string> = {
        0: 'Thành công',
        170: 'Không có trong danh sách chờ',
        178: 'Đã là thành viên nhóm',
        166: 'Không đủ quyền',
      };

      const results: { id: string; status: string }[] = [];
      let successCount = 0;

      if (result && typeof result === 'object') {
        for (const [memberId, status] of Object.entries(result)) {
          const statusCode = status as number;
          const statusText = statusMessages[statusCode] || `Lỗi không xác định (${statusCode})`;
          results.push({ id: memberId, status: statusText });
          if (statusCode === 0) successCount++;
        }
      }

      return {
        success: true,
        data: {
          memberIds,
          action: isApprove ? 'approved' : 'rejected',
          successCount,
          totalCount: memberIds.length,
          results,
          message: `Đã ${isApprove ? 'duyệt' : 'từ chối'} ${successCount}/${memberIds.length} thành viên`,
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
 * Hỗ trợ: file path local, URL ảnh
 */
export const changeGroupAvatarTool: ToolDefinition = {
  name: 'changeGroupAvatar',
  description:
    'Đổi ảnh đại diện nhóm. Bot phải có quyền. Hỗ trợ đường dẫn file ảnh trên máy hoặc URL ảnh (http/https).',
  parameters: [
    {
      name: 'filePath',
      type: 'string',
      description:
        'Đường dẫn file ảnh (VD: "./avatar.jpg") hoặc URL ảnh (http://... hoặc https://...)',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    let tempFilePath: string | null = null;

    try {
      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(context.threadId)) {
        return notGroupError();
      }

      let { filePath } = params;

      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Thiếu đường dẫn file ảnh (filePath)' };
      }

      debugLog('TOOL:changeGroupAvatar', `Changing group avatar: ${filePath}`);

      // Kiểm tra nếu là URL -> download về temp file
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        debugLog('TOOL:changeGroupAvatar', `Detected URL, downloading image...`);

        const downloaded = await fetchImageAsBuffer(filePath);
        if (!downloaded) {
          return {
            success: false,
            error: 'Không thể tải ảnh từ URL. URL có thể đã hết hạn hoặc không hợp lệ.',
          };
        }

        // Xác định extension từ mimeType
        const ext = downloaded.mimeType.includes('png') ? '.png' : '.jpg';
        tempFilePath = path.join(os.tmpdir(), `zalo_avatar_${Date.now()}${ext}`);

        // Lưu buffer vào temp file
        fs.writeFileSync(tempFilePath, downloaded.buffer);
        debugLog(
          'TOOL:changeGroupAvatar',
          `Saved temp file: ${tempFilePath} (${downloaded.buffer.length} bytes)`,
        );

        // Sử dụng temp file path
        filePath = tempFilePath;
      }

      // Kiểm tra file tồn tại (cho cả local file và temp file)
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File không tồn tại: ${filePath}` };
      }

      const result = await context.api.changeGroupAvatar(filePath, context.threadId);
      logZaloAPI('tool:changeGroupAvatar', { filePath, threadId: context.threadId }, result);

      return {
        success: true,
        data: {
          filePath: params.filePath, // Trả về path gốc user cung cấp
          message: 'Đã đổi ảnh đại diện nhóm',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:changeGroupAvatar', `Error: ${error.message}`);
      return { success: false, error: `Lỗi đổi ảnh nhóm: ${error.message}` };
    } finally {
      // Cleanup temp file nếu có
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          debugLog('TOOL:changeGroupAvatar', `Cleaned up temp file: ${tempFilePath}`);
        } catch {
          // Ignore cleanup errors
        }
      }
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
  description: 'Bổ nhiệm thành viên làm Phó nhóm (Admin). Bot phải là Trưởng nhóm (Owner).',
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
      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(context.threadId)) {
        return notGroupError();
      }

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
  description: 'Cách chức Phó nhóm (xuống làm thành viên thường). Bot phải là Trưởng nhóm (Owner).',
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
 * Lấy link tham gia nhóm (Invite Link)
 */
export const getGroupLinkDetailTool: ToolDefinition = {
  name: 'getGroupLinkDetail',
  description:
    'Lấy đường dẫn chia sẻ (Invite Link) của nhóm. Link có dạng https://zalo.me/g/... Bot phải là thành viên nhóm.',
  parameters: [
    {
      name: 'groupId',
      type: 'string',
      description: 'ID của nhóm cần lấy link. Nếu không truyền, sẽ dùng threadId hiện tại.',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const groupId = params.groupId || context.threadId;

      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(groupId)) {
        return notGroupError();
      }

      debugLog('TOOL:getGroupLinkDetail', `Getting group link for ${groupId}`);

      const result = await context.api.getGroupLinkDetail(groupId);
      logZaloAPI('tool:getGroupLinkDetail', { groupId }, result);

      // Kiểm tra link có được bật không
      if (!result?.link || result?.enabled === 0) {
        return {
          success: true,
          data: {
            groupId,
            enabled: false,
            link: null,
            message: 'Nhóm chưa bật tính năng tham gia bằng link. Dùng enableGroupLink để bật.',
            hint: 'Gọi enableGroupLink trước để tạo link mới',
          },
        };
      }

      // Format expiration date
      let expirationInfo = 'Vĩnh viễn';
      if (result.expiration_date && result.expiration_date > 0) {
        const expDate = new Date(result.expiration_date * 1000);
        expirationInfo = expDate.toLocaleString('vi-VN');
      }

      return {
        success: true,
        data: {
          groupId,
          link: result.link,
          enabled: result.enabled === 1,
          expirationDate: result.expiration_date,
          expirationInfo,
          message: `Link nhóm: ${result.link}`,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getGroupLinkDetail', `Error: ${error.message}`);
      return { success: false, error: `Lỗi lấy link nhóm: ${error.message}` };
    }
  },
};

/**
 * Bật link tham gia nhóm
 */
export const enableGroupLinkTool: ToolDefinition = {
  name: 'enableGroupLink',
  description: 'Bật link tham gia nhóm (để người lạ có thể join qua link). Bot phải là Admin.',
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
  description: 'Tắt/vô hiệu hóa link tham gia nhóm (bảo mật). Bot phải là Admin.',
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
  description: 'Lấy thông tin nhóm từ đường link chia sẻ (zalo.me/g/...). Không cần quyền admin.',
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

      // Validate link format
      if (!link.includes('zalo.me/g/')) {
        return {
          success: false,
          error: 'Link không hợp lệ. Link phải có dạng https://zalo.me/g/...',
        };
      }

      debugLog('TOOL:getGroupLinkInfo', `Getting info for link: ${link}`);

      // API yêu cầu object { link: string } thay vì chỉ string
      const result = await context.api.getGroupLinkInfo({ link });
      logZaloAPI('tool:getGroupLinkInfo', { link }, result);

      // Format response với thông tin chi tiết
      const adminIds = result?.adminIds || [];
      const memberCount = result?.totalMember || result?.currentMems?.length || 0;

      return {
        success: true,
        data: {
          groupId: result?.groupId,
          groupName: result?.name,
          description: result?.desc || '',
          memberCount,
          creatorId: result?.creatorId,
          adminIds,
          avatar: result?.avt || result?.fullAvt,
          type: result?.type,
          setting: result?.setting,
          // Danh sách thành viên (nếu có)
          members: result?.currentMems?.map((m: any) => ({
            id: m.id,
            name: m.dName || m.zaloName,
            avatar: m.avatar,
          })),
          hasMoreMember: result?.hasMoreMember === 1,
          raw: result,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getGroupLinkInfo', `Error: ${error.message}`);

      // Xử lý các mã lỗi cụ thể
      const errorMsg = error.message || '';
      if (errorMsg.includes('Tham số không hợp lệ') || errorMsg.includes('Invalid')) {
        return {
          success: false,
          error:
            'Link nhóm không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại link (phải có dạng https://zalo.me/g/xxx)',
        };
      }

      return { success: false, error: `Lỗi lấy thông tin link: ${error.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// GROUP CREATION & JOIN
// ═══════════════════════════════════════════════════

/**
 * Tạo nhóm mới
 */
export const createGroupTool: ToolDefinition = {
  name: 'createGroup',
  description: `Tạo nhóm chat mới. QUAN TRỌNG:
- Bot (Zia) sẽ TỰ MÌNH tạo nhóm và LÀ TRƯỞNG NHÓM (đây là hành vi bình thường, không phải "tạo hộ")
- LUÔN LUÔN thêm ID của người yêu cầu (senderId) vào danh sách members
- Nếu user nói "tạo nhóm với A", members phải gồm CẢ user đó VÀ A
- Sau khi tạo, có thể dùng changeGroupOwner để chuyển quyền trưởng nhóm nếu user muốn`,
  parameters: [
    {
      name: 'members',
      type: 'object',
      description:
        'Mảng User ID của TẤT CẢ thành viên muốn thêm, BAO GỒM CẢ người yêu cầu (senderId). VD: ["senderId", "uid1", "uid2"]',
      required: true,
    },
    {
      name: 'name',
      type: 'string',
      description: 'Tên nhóm (tùy chọn, nếu không điền sẽ tự đặt theo tên thành viên)',
      required: false,
    },
    {
      name: 'avatarPath',
      type: 'string',
      description: 'Đường dẫn file ảnh để làm avatar nhóm (tùy chọn)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { members, name, avatarPath } = params;

      if (!Array.isArray(members) || members.length === 0) {
        return {
          success: false,
          error:
            'Cần ít nhất 1 userId trong members. Lưu ý: PHẢI thêm cả ID của người yêu cầu (senderId) vào danh sách!',
        };
      }

      // Tự động thêm senderId nếu chưa có trong danh sách
      const memberList = members.map(String);
      if (context.senderId && !memberList.includes(context.senderId)) {
        memberList.push(context.senderId);
        debugLog('TOOL:createGroup', `Auto-added senderId ${context.senderId} to members list`);
      }

      debugLog(
        'TOOL:createGroup',
        `Creating group with ${memberList.length} members, name: ${name || 'auto'}`,
      );

      const options: { name?: string; members: string[]; avatarSource?: string } = {
        members: memberList,
      };

      if (name && typeof name === 'string') {
        options.name = name;
      }

      if (avatarPath && typeof avatarPath === 'string') {
        options.avatarSource = avatarPath;
      }

      const result = await context.api.createGroup(options);
      logZaloAPI('tool:createGroup', { options }, result);

      const successMembers = result?.sucessMembers || result?.successMembers || [];
      const errorMembers = result?.errorMembers || [];

      return {
        success: true,
        data: {
          groupId: result?.groupId,
          name: name || 'Nhóm mới',
          successMembers,
          errorMembers,
          botIsOwner: true,
          message: `Đã tạo nhóm thành công! ID: ${result?.groupId}. Bot (Zia) là Trưởng nhóm.`,
          hint:
            errorMembers.length > 0
              ? `Có ${errorMembers.length} người không thêm được (có thể do chặn số lạ). Dùng changeGroupOwner nếu muốn chuyển quyền trưởng nhóm.`
              : 'Tất cả thành viên đã được thêm. Dùng changeGroupOwner nếu muốn chuyển quyền trưởng nhóm cho người khác.',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:createGroup', `Error: ${error.message}`);
      return { success: false, error: `Lỗi tạo nhóm: ${error.message}` };
    }
  },
};

/**
 * Tham gia nhóm qua link
 */
export const joinGroupLinkTool: ToolDefinition = {
  name: 'joinGroupLink',
  description:
    'Bot tham gia nhóm thông qua đường link chia sẻ (zalo.me/g/...). Dùng khi admin gửi link nhóm để Bot vào hoạt động.',
  parameters: [
    {
      name: 'link',
      type: 'string',
      description: 'Đường link đầy đủ của nhóm (VD: https://zalo.me/g/abcxyz)',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { link } = params;

      if (!link || typeof link !== 'string') {
        return { success: false, error: 'Thiếu link nhóm' };
      }

      // Validate link format
      if (!link.includes('zalo.me/g/')) {
        return {
          success: false,
          error: 'Link không hợp lệ. Link phải có dạng https://zalo.me/g/...',
        };
      }

      debugLog('TOOL:joinGroupLink', `Joining group via link: ${link}`);

      const result = await context.api.joinGroupLink(link);
      logZaloAPI('tool:joinGroupLink', { link }, result);

      // joinGroupLink trả về chuỗi rỗng nếu thành công
      return {
        success: true,
        data: {
          link,
          message: 'Đã tham gia nhóm thành công!',
          hint: 'Bot đã vào nhóm và sẵn sàng hoạt động',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:joinGroupLink', `Error: ${error.message}`);

      // Xử lý các mã lỗi thường gặp
      const errorCode = error?.code || error?.errorCode;

      if (errorCode === 178) {
        return {
          success: true,
          data: {
            link: params.link,
            message: 'Bot đã là thành viên của nhóm này rồi',
            alreadyMember: true,
          },
        };
      }

      if (errorCode === 240) {
        return {
          success: true,
          data: {
            link: params.link,
            message: 'Đã gửi yêu cầu tham gia, đang chờ Admin nhóm duyệt',
            pendingApproval: true,
          },
        };
      }

      return { success: false, error: `Lỗi tham gia nhóm: ${error.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// GROUP LEAVE & DISPERSE (DESTRUCTIVE ACTIONS)
// ═══════════════════════════════════════════════════

/**
 * Rời khỏi nhóm
 */
export const leaveGroupTool: ToolDefinition = {
  name: 'leaveGroup',
  description: `⚠️ Bot tự rời khỏi nhóm. Sau khi rời, Bot sẽ không còn nhận tin nhắn từ nhóm đó.
Có thể rời "âm thầm" (không hiện thông báo) hoặc bình thường.
Chỉ dùng khi Admin/Owner yêu cầu Bot rời đi.`,
  parameters: [
    {
      name: 'groupId',
      type: 'string',
      description: 'ID của nhóm cần rời. Nếu không truyền, sẽ dùng threadId hiện tại.',
      required: false,
    },
    {
      name: 'silent',
      type: 'boolean',
      description:
        'true = Rời âm thầm (không hiện thông báo), false = Hiện thông báo rời nhóm. Mặc định: false',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const groupId = params.groupId || context.threadId;
      const silent = params.silent === true;

      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(groupId)) {
        return {
          success: false,
          error: 'Chỉ có thể rời khỏi nhóm chat, không phải chat 1-1.',
        };
      }

      debugLog('TOOL:leaveGroup', `Leaving group ${groupId}, silent: ${silent}`);

      const result = await context.api.leaveGroup(groupId, silent);
      logZaloAPI('tool:leaveGroup', { groupId, silent }, result);

      return {
        success: true,
        data: {
          groupId,
          silent,
          message: silent
            ? 'Đã rời nhóm âm thầm. Tạm biệt!'
            : 'Đã rời khỏi nhóm. Tạm biệt mọi người!',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:leaveGroup', `Error: ${error.message}`);
      return { success: false, error: `Lỗi rời nhóm: ${error.message}` };
    }
  },
};

/**
 * Giải tán nhóm (xóa vĩnh viễn)
 */
export const disperseGroupTool: ToolDefinition = {
  name: 'disperseGroup',
  description: `💥 NGUY HIỂM: Giải tán (xóa vĩnh viễn) nhóm. Tất cả thành viên sẽ bị kick và nhóm biến mất hoàn toàn.
⚠️ YÊU CẦU: Bot PHẢI là Trưởng nhóm (Owner/Key) mới có quyền giải tán.
Nếu Bot chỉ là Phó nhóm (Admin), lệnh này sẽ thất bại.
CHỈ DÙNG KHI OWNER YÊU CẦU VÀ XÁC NHẬN RÕ RÀNG.`,
  parameters: [
    {
      name: 'groupId',
      type: 'string',
      description: 'ID của nhóm cần giải tán. Nếu không truyền, sẽ dùng threadId hiện tại.',
      required: false,
    },
    {
      name: 'confirm',
      type: 'boolean',
      description: 'Phải truyền confirm=true để xác nhận giải tán. Đây là biện pháp an toàn.',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const groupId = params.groupId || context.threadId;
      const confirm = params.confirm === true;

      // Kiểm tra xác nhận
      if (!confirm) {
        return {
          success: false,
          error:
            'Cần truyền confirm=true để xác nhận giải tán nhóm. Đây là hành động không thể hoàn tác!',
        };
      }

      // Kiểm tra ngữ cảnh nhóm
      if (!isGroupContext(groupId)) {
        return {
          success: false,
          error: 'Chỉ có thể giải tán nhóm chat, không phải chat 1-1.',
        };
      }

      debugLog('TOOL:disperseGroup', `Dispersing group ${groupId}`);

      const result = await context.api.disperseGroup(groupId);
      logZaloAPI('tool:disperseGroup', { groupId }, result);

      return {
        success: true,
        data: {
          groupId,
          message: '💥 Đã giải tán nhóm thành công! Nhóm đã bị xóa vĩnh viễn.',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:disperseGroup', `Error: ${error.message}`);

      // Xử lý lỗi quyền
      if (error.message?.includes('permission') || error.message?.includes('quyền')) {
        return {
          success: false,
          error:
            'Bot không phải Trưởng nhóm nên không có quyền giải tán. Chỉ Owner mới có thể xóa nhóm.',
        };
      }

      return { success: false, error: `Lỗi giải tán nhóm: ${error.message}` };
    }
  },
};
