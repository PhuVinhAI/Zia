/**
 * Tool: getUserInfo - Lấy thông tin chi tiết của user đã là bạn bè
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import { GetUserInfoSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

export const getUserInfoTool: ToolDefinition = {
  name: 'getUserInfo',
  description:
    'Lấy thông tin chi tiết của một người dùng đã là bạn bè (hoặc người trong cùng nhóm, người đã từng chat). Dùng User ID (UID) để lấy thông tin như tên, giới tính, ngày sinh, avatar, trạng thái.',
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description:
        'User ID (UID) của người cần lấy thông tin. Nếu không truyền sẽ lấy thông tin người đang chat.',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParams(GetUserInfoSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      // Đảm bảo userId luôn là string
      let userId = data.userId || context.senderId;

      if (!userId) {
        return { success: false, error: 'Không có userId để lấy thông tin' };
      }

      userId = String(userId);

      debugLog('TOOL:getUserInfo', `Calling API with userId=${userId}`);
      const result = await context.api.getUserInfo(userId);
      logZaloAPI('tool:getUserInfo', { userId }, result);
      debugLog('TOOL:getUserInfo', `Raw response: ${JSON.stringify(result)}`);

      const profile = result?.changed_profiles?.[userId];

      if (!profile) {
        return {
          success: false,
          error: `Không tìm thấy thông tin user ${userId}`,
        };
      }

      const genderStr =
        profile.gender === 0 ? 'Nam' : profile.gender === 1 ? 'Nữ' : 'Không xác định';

      return {
        success: true,
        data: {
          userId: profile.userId || userId,
          displayName: profile.displayName || 'Không có tên',
          zaloName: profile.zaloName || profile.displayName || 'Không có',
          gender: genderStr,
          genderCode: profile.gender,
          birthday: profile.sdob || 'Không có',
          avatar: profile.avatar || null,
          status: profile.status || 'Không có trạng thái',
          phoneNumber: profile.phoneNumber || null,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy thông tin user: ${error.message}`,
      };
    }
  },
};
