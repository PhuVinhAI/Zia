/**
 * Action Executor - Thực thi các actions từ background agent
 */
import { debugLog } from '../../core/logger/logger.js';
import type { AgentTask } from '../../infrastructure/database/schema.js';
import { saveResponseToHistory, saveSentMessage } from '../../shared/utils/history.js';
import { getThreadType } from '../../modules/gateway/response.handler.js';
import { splitMessage } from '../../shared/utils/messageChunker.js';

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute task dựa trên type
 * Note: accept_friend đã được xử lý tự động trong agent.runner, không cần task
 */
export async function executeTask(api: any, task: AgentTask): Promise<ExecutionResult> {
  const payload = JSON.parse(task.payload);

  switch (task.type) {
    case 'send_message':
      return executeSendMessage(api, task, payload);
    case 'send_friend_request':
      return executeSendFriendRequest(api, task, payload);
    default:
      return { success: false, error: `Unknown task type: ${task.type}` };
  }
}

/**
 * Gửi tin nhắn
 * Hỗ trợ targetDescription - agent sẽ resolve từ danh sách nhóm/bạn bè
 */
async function executeSendMessage(
  api: any,
  task: AgentTask,
  payload: {
    message: string;
    targetDescription?: string;
    resolvedThreadId?: string;
    resolvedUserId?: string;
  },
): Promise<ExecutionResult> {
  // Ưu tiên resolved IDs (đã được Groq resolve) > task IDs
  // resolvedThreadId cho nhóm, resolvedUserId cho bạn bè
  let threadId =
    payload.resolvedThreadId || payload.resolvedUserId || task.targetThreadId || task.targetUserId;

  // Nếu có targetDescription nhưng chưa có threadId, cần resolve
  if (!threadId && payload.targetDescription) {
    debugLog('EXECUTOR', `Need to resolve targetDescription: ${payload.targetDescription}`);
    return {
      success: false,
      error: `Cần Groq resolve targetDescription "${payload.targetDescription}" thành ID`,
      data: { needsResolution: true, targetDescription: payload.targetDescription },
    };
  }

  if (!threadId) {
    return { success: false, error: 'Missing threadId, targetUserId or targetDescription' };
  }

  if (!payload.message) {
    return { success: false, error: 'Missing message content' };
  }

  try {
    debugLog('EXECUTOR', `Sending message to ${threadId}: ${payload.message.substring(0, 50)}...`);

    const threadType = getThreadType(threadId);
    
    // Chia nhỏ tin nhắn nếu quá dài
    const chunks = splitMessage(payload.message);
    debugLog('EXECUTOR', `Message split into ${chunks.length} chunks`);
    
    let lastResult: any = null;
    let msgIndex = -1;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      debugLog('EXECUTOR', `Sending chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      lastResult = await api.sendMessage(chunk, threadId, threadType);
      
      // Lưu vào sent messages để AI có thể quote và undo
      msgIndex = saveSentMessage(
        threadId,
        lastResult.msgId,
        lastResult.cliMsgId || '',
        chunk,
      );
      
      // Delay nhỏ giữa các chunk để tránh rate limit
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Lưu toàn bộ message vào history để AI nhớ đã gửi tin nhắn này
    await saveResponseToHistory(threadId, payload.message);

    debugLog('EXECUTOR', `Message saved to history and sent_messages (index=${msgIndex})`);

    debugLog('EXECUTOR', `Message sent successfully`);
    return {
      success: true,
      data: { msgId: lastResult?.msgId, threadId, msgIndex, savedToHistory: true, chunks: chunks.length },
    };
  } catch (error: any) {
    debugLog('EXECUTOR', `Failed to send message: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi lời mời kết bạn
 * Hỗ trợ cả số điện thoại (sẽ tự động findUser) và UID trực tiếp
 */
async function executeSendFriendRequest(
  api: any,
  task: AgentTask,
  payload: { message?: string },
): Promise<ExecutionResult> {
  const targetId = task.targetUserId;
  if (!targetId) {
    return { success: false, error: 'Missing targetUserId' };
  }

  // Message tối đa ~150 ký tự theo spec Zalo
  const message = (payload.message || 'Xin chào, mình muốn kết bạn với bạn!').substring(0, 150);

  try {
    let uid = targetId;
    let displayName = targetId;

    // Kiểm tra xem targetId có phải số điện thoại không (bắt đầu bằng 0 hoặc 84)
    const isPhoneNumber = /^(0|84)\d{9,10}$/.test(targetId);

    if (isPhoneNumber) {
      // Bước 1: Tìm user từ số điện thoại
      debugLog('EXECUTOR', `Finding user by phone: ${targetId}`);
      const userInfo = await api.findUser(targetId);

      if (!userInfo || !userInfo.uid) {
        return {
          success: false,
          error: `Không tìm thấy user với SĐT: ${targetId} (có thể họ chặn tìm kiếm)`,
        };
      }

      uid = userInfo.uid;
      displayName = userInfo.display_name || uid;
      debugLog('EXECUTOR', `Found user: ${displayName} (${uid})`);
    }

    // Bước 2: Gửi lời mời kết bạn
    debugLog('EXECUTOR', `Sending friend request to ${displayName} (${uid}): ${message}`);
    await api.sendFriendRequest(message, uid);

    debugLog('EXECUTOR', `Friend request sent successfully`);
    return {
      success: true,
      data: { uid, displayName, message, action: 'sent' },
    };
  } catch (error: any) {
    // Xử lý các mã lỗi Zalo
    const errorCode = error.code;

    if (errorCode === 225) {
      debugLog('EXECUTOR', `Already friends with ${targetId}`);
      return { success: true, data: { targetId, action: 'already_friends' } };
    }

    if (errorCode === 215) {
      debugLog('EXECUTOR', `User ${targetId} blocked friend requests`);
      return { success: false, error: 'Người này chặn nhận lời mời kết bạn' };
    }

    if (errorCode === 222) {
      debugLog('EXECUTOR', `User ${targetId} already sent request to us`);
      // Tự động accept nếu họ đã gửi lời mời cho mình
      try {
        const uid = targetId.match(/^(0|84)\d{9,10}$/)
          ? (await api.findUser(targetId))?.uid
          : targetId;
        if (uid) {
          await api.acceptFriendRequest(uid);
          debugLog('EXECUTOR', `Auto-accepted friend request from ${uid}`);
          return { success: true, data: { uid, action: 'auto_accepted' } };
        }
      } catch (acceptError) {
        debugLog('EXECUTOR', `Failed to auto-accept: ${acceptError}`);
      }
      return { success: false, error: 'Người này đã gửi lời mời cho bạn rồi' };
    }

    debugLog('EXECUTOR', `Failed to send friend request: ${error.message} (code: ${errorCode})`);
    return { success: false, error: error.message };
  }
}
