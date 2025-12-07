/**
 * Tool: getGroupMembers - Lấy danh sách thành viên trong nhóm chat
 * Dùng để AI biết ai đang ở trong nhóm và có thể tag (mention) họ
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

// Cache danh sách thành viên nhóm (threadId -> members)
export const groupMembersCache = new Map<
  string,
  Array<{ name: string; id: string; role: string }>
>();

export const getGroupMembersTool: ToolDefinition = {
  name: 'getGroupMembers',
  description:
    'Lấy danh sách thành viên trong nhóm chat hiện tại. Trả về tên và ID để có thể tag (mention) họ. Chỉ hoạt động trong nhóm chat.',
  parameters: [],
  execute: async (_params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      debugLog('TOOL:getGroupMembers', `Getting members for threadId=${context.threadId}`);

      // Gọi API lấy thông tin nhóm
      const groupInfo = await context.api.getGroupInfo(context.threadId);
      logZaloAPI('tool:getGroupMembers', { threadId: context.threadId }, groupInfo);

      // API trả về object dạng { gridInfoMap: { 'groupId': Info } }
      const info = groupInfo?.gridInfoMap?.[context.threadId];

      if (!info) {
        return {
          success: false,
          error: 'Không tìm thấy thông tin nhóm. Có thể đây không phải là nhóm chat.',
        };
      }

      // Map danh sách thành viên
      const adminIds = info.adminIds || [];
      const creatorId = info.creatorId;

      const rawMembers: any[] = info.currentMems || info.members || [];
      const members = rawMembers.map((m) => {
        let role = 'Member';
        if (m.id === creatorId) role = 'Creator';
        else if (adminIds.includes(m.id)) role = 'Admin';

        return {
          name: m.dName || m.zaloName || m.displayName || 'Không tên',
          id: String(m.id),
          role,
        };
      });

      // Lưu vào cache
      groupMembersCache.set(context.threadId, members);

      // Format text để AI dễ đọc
      const summary = members.map((m) => `- ${m.name} (ID: ${m.id}) [${m.role}]`).join('\n');

      debugLog('TOOL:getGroupMembers', `Found ${members.length} members`);

      return {
        success: true,
        data: {
          groupName: info.name || 'Không tên',
          count: members.length,
          members: members,
          summary: summary,
          hint: 'Dùng cú pháp [mention:ID:Tên] để tag thành viên. VD: [mention:123456:Nguyễn Văn A]',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:getGroupMembers', `Error: ${error.message}`);
      return {
        success: false,
        error: `Lỗi lấy thành viên nhóm: ${error.message}`,
      };
    }
  },
};
