/**
 * Action Executor - Thực thi các actions từ background agent
 */
import { debugLog } from '../../core/logger/logger.js';
import type { AgentTask } from '../../infrastructure/database/schema.js';
import { ThreadType } from '../../infrastructure/zalo/zalo.service.js';
import { saveResponseToHistory, saveSentMessage } from '../../shared/utils/history.js';

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute task dựa trên type
 */
export async function executeTask(api: any, task: AgentTask): Promise<ExecutionResult> {
  const payload = JSON.parse(task.payload);

  switch (task.type) {
    case 'send_message':
      return executeSendMessage(api, task, payload);
    case 'accept_friend':
      return executeAcceptFriend(api, task, payload);
    case 'send_friend_request':
      return executeSendFriendRequest(api, task, payload);
    default:
      return { success: false, error: `Unknown task type: ${task.type}` };
  }
}

/**
 * Gửi tin nhắn
 */
async function executeSendMessage(
  api: any,
  task: AgentTask,
  payload: { message: string },
): Promise<ExecutionResult> {
  const threadId = task.targetThreadId || task.targetUserId;
  if (!threadId) {
    return { success: false, error: 'Missing threadId or targetUserId' };
  }

  if (!payload.message) {
    return { success: false, error: 'Missing message content' };
  }

  try {
    debugLog('EXECUTOR', `Sending message to ${threadId}: ${payload.message.substring(0, 50)}...`);

    const result = await api.sendMessage(payload.message, threadId, ThreadType.User);

    // Lưu vào history để AI nhớ đã gửi tin nhắn này
    await saveResponseToHistory(threadId, payload.message);

    // Lưu vào sent messages để AI có thể quote và undo
    const msgIndex = saveSentMessage(
      threadId,
      result.msgId,
      result.cliMsgId || '',
      payload.message,
    );

    debugLog('EXECUTOR', `Message saved to history and sent_messages (index=${msgIndex})`);

    debugLog('EXECUTOR', `Message sent successfully`);
    return {
      success: true,
      data: { msgId: result.msgId, threadId, msgIndex, savedToHistory: true },
    };
  } catch (error: any) {
    debugLog('EXECUTOR', `Failed to send message: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Chấp nhận lời mời kết bạn
 */
async function executeAcceptFriend(
  api: any,
  task: AgentTask,
  payload: Record<string, any>,
): Promise<ExecutionResult> {
  const friendId = task.targetUserId;
  if (!friendId) {
    return { success: false, error: 'Missing targetUserId (friendId)' };
  }

  try {
    debugLog('EXECUTOR', `Accepting friend request from ${friendId}`);

    await api.acceptFriendRequest(friendId);

    debugLog('EXECUTOR', `Friend request accepted`);
    return {
      success: true,
      data: { friendId, action: 'accepted' },
    };
  } catch (error: any) {
    debugLog('EXECUTOR', `Failed to accept friend: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi lời mời kết bạn
 */
async function executeSendFriendRequest(
  api: any,
  task: AgentTask,
  payload: { message?: string },
): Promise<ExecutionResult> {
  const userId = task.targetUserId;
  if (!userId) {
    return { success: false, error: 'Missing targetUserId' };
  }

  const message = payload.message || 'Xin chào, mình muốn kết bạn với bạn!';

  try {
    debugLog('EXECUTOR', `Sending friend request to ${userId}: ${message}`);

    await api.sendFriendRequest(message, userId);

    debugLog('EXECUTOR', `Friend request sent`);
    return {
      success: true,
      data: { userId, message, action: 'sent' },
    };
  } catch (error: any) {
    debugLog('EXECUTOR', `Failed to send friend request: ${error.message}`);
    return { success: false, error: error.message };
  }
}
