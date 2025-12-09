/**
 * Tool: getGroupMembers - Lấy danh sách thành viên trong nhóm chat
 * Dùng để AI biết ai đang ở trong nhóm và có thể tag (mention) họ
 */

import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

// Cache danh sách thành viên nhóm (threadId -> members)
export const groupMembersCache = new Map<
  string,
  Array<{ name: string; id: string; role: string }>
>();

/**
 * Delay ngẫu nhiên để giả lập hành vi người dùng
 * @param min - Thời gian tối thiểu (ms)
 * @param max - Thời gian tối đa (ms)
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Lấy thông tin chi tiết của nhiều user từ danh sách ID
 * Gọi API getUserInfo cho từng user và trả về danh sách đầy đủ
 * Có delay random giữa các lần gọi để giống người dùng thật
 */
async function fetchUserDetails(
  api: any,
  memberIds: string[],
  adminIds: string[],
  creatorId: string,
): Promise<Array<{ name: string; id: string; role: string }>> {
  const members: Array<{ name: string; id: string; role: string }> = [];

  for (let i = 0; i < memberIds.length; i++) {
    const id = memberIds[i];
    let name = `User ${id.slice(-4)}`; // Tên mặc định nếu không lấy được

    // Delay random giữa các lần gọi (trừ lần đầu)
    const delayMin = CONFIG.groupMembersFetch?.delayMinMs ?? 300;
    const delayMax = CONFIG.groupMembersFetch?.delayMaxMs ?? 800;
    if (i > 0) {
      await randomDelay(delayMin, delayMax);
    }

    try {
      // Gọi API lấy thông tin user
      const userInfo = await api.getUserInfo(id);
      const profile = userInfo?.changed_profiles?.[id];

      if (profile) {
        name = profile.displayName || profile.zaloName || profile.dName || name;
        debugLog('TOOL:getGroupMembers', `Got user info: ${id} -> ${name}`);
      }
    } catch (e: any) {
      debugLog('TOOL:getGroupMembers', `Failed to get user info for ${id}: ${e.message}`);
      // Nếu bị lỗi (có thể rate limit), delay thêm một chút
      const errorDelayMin = CONFIG.groupMembersFetch?.errorDelayMinMs ?? 500;
      const errorDelayMax = CONFIG.groupMembersFetch?.errorDelayMaxMs ?? 1000;
      await randomDelay(errorDelayMin, errorDelayMax);
    }

    // Xác định role
    let role = 'Member';
    if (id === creatorId) role = 'Creator';
    else if (adminIds.includes(id)) role = 'Admin';

    members.push({ name, id: String(id), role });
  }

  return members;
}

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
      let members: Array<{ name: string; id: string; role: string }> = [];

      // Nếu currentMems có data đầy đủ
      if (rawMembers.length > 0 && rawMembers[0]?.id) {
        members = rawMembers.map((m) => {
          let role = 'Member';
          if (m.id === creatorId) role = 'Creator';
          else if (adminIds.includes(m.id)) role = 'Admin';

          return {
            name: m.dName || m.zaloName || m.displayName || 'Không tên',
            id: String(m.id),
            role,
          };
        });
      }
      // Fallback: lấy từ memVerList (format: "userId_version")
      else if (info.memVerList && info.memVerList.length > 0) {
        debugLog(
          'TOOL:getGroupMembers',
          `Using memVerList fallback, count: ${info.memVerList.length}`,
        );
        const memberIds = info.memVerList.map((mv: string) => mv.split('_')[0]);

        // Gọi API lấy thông tin chi tiết từng user
        members = await fetchUserDetails(context.api, memberIds, adminIds, creatorId);
      }
      // Fallback 2: lấy từ memberIds
      else if (info.memberIds && info.memberIds.length > 0) {
        debugLog(
          'TOOL:getGroupMembers',
          `Using memberIds fallback, count: ${info.memberIds.length}`,
        );

        // Gọi API lấy thông tin chi tiết từng user
        members = await fetchUserDetails(context.api, info.memberIds, adminIds, creatorId);
      }

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
