/**
 * Context Builder - Thu thập ngữ cảnh môi trường cho background agent
 */
import { debugLog } from '../../core/logger/logger.js';

export interface EnvironmentContext {
  // Online status
  onlineUsers: Array<{ userId: string; status: string }>;
  onlineCount: number;
  // Friend requests
  pendingFriendRequests: Array<{
    userId: string;
    displayName: string;
    avatar: string;
    message: string;
    time: number;
  }>;
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
    pendingFriendRequests: [],
    relevantMemories: [],
    timestamp: new Date(),
  };

  try {
    // 1. Lấy danh sách online
    const onlineRes = await api.getFriendOnlines();
    context.onlineUsers = onlineRes.onlines || [];
    context.onlineCount = context.onlineUsers.length;
    debugLog('CONTEXT', `Online users: ${context.onlineCount}`);
  } catch (e) {
    debugLog('CONTEXT', `Error getting online users: ${e}`);
  }

  try {
    // 2. Lấy pending friend requests (nếu API hỗ trợ)
    if (typeof api.getSentFriendRequest === 'function') {
      const reqRes = await api.getSentFriendRequest();
      context.pendingFriendRequests = Object.values(reqRes || {}).map((r: any) => ({
        userId: r.userId,
        displayName: r.displayName,
        avatar: r.avatar,
        message: r.fReqInfo?.message || '',
        time: r.fReqInfo?.time || 0,
      }));
      debugLog('CONTEXT', `Pending friend requests: ${context.pendingFriendRequests.length}`);
    }
  } catch (e) {
    // Bỏ qua lỗi - API có thể không hỗ trợ hoặc session không có quyền
  }

  // 3. Lấy thông tin target user nếu có
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

  // Friend requests
  if (context.pendingFriendRequests.length > 0) {
    lines.push(`### Lời mời kết bạn đang chờ (${context.pendingFriendRequests.length}):`);
    for (const req of context.pendingFriendRequests.slice(0, 5)) {
      lines.push(`- ${req.displayName} (${req.userId}): "${req.message}"`);
    }
    lines.push('');
  }

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

  lines.push(`### Thời gian: ${context.timestamp.toLocaleString('vi-VN')}`);

  return lines.join('\n');
}
