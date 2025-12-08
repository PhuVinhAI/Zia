/**
 * Context Builder - Thu thập ngữ cảnh môi trường cho background agent
 */
import { debugLog } from '../../core/logger/logger.js';

/**
 * Delay random trong khoảng min-max ms (giống hành vi người dùng)
 */
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export interface GroupInfo {
  groupId: string;
  name: string;
  totalMember: number;
}

export interface FriendInfo {
  userId: string;
  displayName: string;
  gender: string;
}

export interface EnvironmentContext {
  // Online status
  onlineUsers: Array<{ userId: string; status: string }>;
  onlineCount: number;
  // Danh sách nhóm bot tham gia
  joinedGroups: GroupInfo[];
  totalGroups: number;
  // Danh sách bạn bè
  friends: FriendInfo[];
  totalFriends: number;
  // Target user info (nếu có)
  targetUserInfo?: {
    userId: string;
    displayName: string;
    zaloName: string;
    gender: number;
    avatar: string;
    birthday?: string;
  };
  // Memories từ vector DB
  relevantMemories: string[];
  // Timestamp
  timestamp: Date;
}

/**
 * Thu thập context từ Zalo API
 */
export async function buildEnvironmentContext(
  api: any,
  targetUserId?: string,
): Promise<EnvironmentContext> {
  const context: EnvironmentContext = {
    onlineUsers: [],
    onlineCount: 0,
    joinedGroups: [],
    totalGroups: 0,
    friends: [],
    totalFriends: 0,
    relevantMemories: [],
    timestamp: new Date(),
  };

  try {
    // 1. Lấy danh sách online
    const onlineRes = await api.getFriendOnlines();
    context.onlineUsers = onlineRes?.onlines || [];
    context.onlineCount = context.onlineUsers.length;
    debugLog('CONTEXT', `Online users: ${context.onlineCount}`);
  } catch (e: any) {
    // Bỏ qua lỗi JSON parse - API có thể trả về response không hợp lệ khi không có ai online
    if (e?.message?.includes('JSON') || e?.message?.includes('Unexpected')) {
      debugLog('CONTEXT', `No online users (API returned invalid response)`);
    } else {
      debugLog('CONTEXT', `Error getting online users: ${e?.message || e}`);
    }
  }

  try {
    // 2. Lấy danh sách nhóm bot tham gia
    const groupsRes = await api.getAllGroups();
    const groupIds = Object.keys(groupsRes.gridVerMap || {});
    context.totalGroups = groupIds.length;

    // Lấy thông tin chi tiết TẤT CẢ nhóm theo batch với delay random
    if (groupIds.length > 0) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < groupIds.length; i += BATCH_SIZE) {
        const batch = groupIds.slice(i, i + BATCH_SIZE);
        const infoRes = await api.getGroupInfo(batch);

        for (const gid of batch) {
          const info = infoRes.gridInfoMap?.[gid];
          if (info) {
            context.joinedGroups.push({
              groupId: gid,
              name: info.name,
              totalMember: info.totalMember,
            });
          }
        }

        // Delay random 500-1500ms giữa các batch (giống người dùng)
        if (i + BATCH_SIZE < groupIds.length) {
          await randomDelay(500, 1500);
        }
      }
    }
    debugLog('CONTEXT', `Joined groups: ${context.totalGroups}`);
  } catch (e) {
    debugLog('CONTEXT', `Error getting groups: ${e}`);
  }

  try {
    // 3. Lấy danh sách bạn bè
    const friends = await api.getAllFriends();
    if (Array.isArray(friends)) {
      context.totalFriends = friends.length;
      context.friends = friends.map((f: any) => ({
        userId: f.userId,
        displayName: f.displayName || f.zaloName || 'Không tên',
        gender: f.gender === 0 ? 'Nam' : f.gender === 1 ? 'Nữ' : 'Không xác định',
      }));
      debugLog('CONTEXT', `Friends: ${context.totalFriends}`);
    }
  } catch (e) {
    debugLog('CONTEXT', `Error getting friends: ${e}`);
  }

  // 4. Lấy thông tin target user nếu có
  if (targetUserId) {
    try {
      const userRes = await api.getUserInfo(targetUserId);
      const profile = userRes.changed_profiles?.[targetUserId];
      if (profile) {
        context.targetUserInfo = {
          userId: profile.userId,
          displayName: profile.displayName,
          zaloName: profile.zaloName,
          gender: profile.gender,
          avatar: profile.avatar,
          birthday: profile.sdob,
        };
        debugLog('CONTEXT', `Target user: ${profile.displayName}`);
      }
    } catch (e) {
      debugLog('CONTEXT', `Error getting user info: ${e}`);
    }
  }

  return context;
}

/**
 * Format context thành prompt cho Groq
 */
export function formatContextForPrompt(context: EnvironmentContext): string {
  const lines: string[] = ['## Ngữ cảnh môi trường hiện tại:', ''];

  // Online status
  lines.push(`### Trạng thái online:`);
  lines.push(`- Số người đang online: ${context.onlineCount}`);
  if (context.onlineUsers.length > 0 && context.onlineUsers.length <= 10) {
    lines.push(`- IDs: ${context.onlineUsers.map((u) => u.userId).join(', ')}`);
  }
  lines.push('');

  // Joined groups
  lines.push(`### Nhóm bot tham gia (${context.totalGroups} nhóm):`);
  if (context.joinedGroups.length > 0) {
    for (const g of context.joinedGroups) {
      lines.push(`- ${g.name} (ID: ${g.groupId}) - ${g.totalMember} thành viên`);
    }
  }
  lines.push('');

  // Friends list
  lines.push(`### Danh sách bạn bè (${context.totalFriends} người):`);
  if (context.friends.length > 0) {
    for (const f of context.friends) {
      lines.push(`- ${f.displayName} (ID: ${f.userId}) - ${f.gender}`);
    }
  }
  lines.push('');

  // Target user
  if (context.targetUserInfo) {
    const u = context.targetUserInfo;
    const gender = u.gender === 0 ? 'Nam' : 'Nữ';
    lines.push(`### Thông tin người nhận:`);
    lines.push(`- Tên: ${u.displayName} (${u.zaloName})`);
    lines.push(`- Giới tính: ${gender}`);
    if (u.birthday) lines.push(`- Sinh nhật: ${u.birthday}`);
    lines.push('');
  }

  // Memories
  if (context.relevantMemories.length > 0) {
    lines.push(`### Ký ức liên quan:`);
    for (const mem of context.relevantMemories) {
      lines.push(`- ${mem}`);
    }
    lines.push('');
  }

  // Hướng dẫn cú pháp đặc biệt
  lines.push(`### Cú pháp đặc biệt trong tin nhắn:`);
  lines.push(`1. **Tag/Mention người dùng:** [mention:USER_ID:TÊN_HIỂN_THỊ]`);
  lines.push(`   Ví dụ: "Chào [mention:123456789:Nguyễn Văn A] nhé!" → "Chào @Nguyễn Văn A nhé!"`);
  lines.push(`   Lưu ý: USER_ID phải là ID số từ danh sách bạn bè hoặc thành viên nhóm.`);
  lines.push('');
  lines.push(`2. **Gửi sticker:** [sticker:KEYWORD]`);
  lines.push(`   Keywords: hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry`);
  lines.push(`   Ví dụ: "Chúc mừng sinh nhật! [sticker:love]" → Gửi tin nhắn + sticker`);
  lines.push('');
  lines.push(`3. **Gửi link với preview:** [text](url)`);
  lines.push(
    `   Ví dụ: "Xem video này [YouTube](https://youtube.com/watch?v=xxx)" → Gửi link với preview`,
  );
  lines.push('');
  lines.push(`4. **Markdown:** Hỗ trợ **bold**, *italic*, \`code\``);
  lines.push('');

  lines.push(`### Thời gian: ${context.timestamp.toLocaleString('vi-VN')}`);

  return lines.join('\n');
}
