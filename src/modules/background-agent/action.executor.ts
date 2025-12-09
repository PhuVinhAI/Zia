/**
 * Action Executor - Thực thi các actions từ background agent
 */
import { debugLog } from '../../core/logger/logger.js';
import type { AgentTask } from '../../infrastructure/database/schema.js';
import { ThreadType } from '../../infrastructure/messaging/zalo/zalo.service.js';
import { saveResponseToHistory } from '../../shared/utils/history/history.js';
import {
  getThreadType,
  sendTextMessage,
  setThreadType,
} from '../../shared/utils/message/messageSender.js';
import { saveSentMessage } from '../../shared/utils/message/messageStore.js';

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
    default:
      return { success: false, error: `Unknown task type: ${task.type}` };
  }
}

/**
 * Gửi tin nhắn
 * Hỗ trợ targetDescription - agent sẽ resolve từ danh sách nhóm/bạn bè
 * Sử dụng shared sendTextMessage để hỗ trợ mention/tag và markdown
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
  const threadId =
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

    // Xác định ThreadType: nếu dùng resolvedThreadId (từ nhóm) → Group, resolvedUserId (từ bạn bè) → User
    // Fallback: check threadTypeStore hoặc dựa vào nguồn gốc của ID
    let threadType = getThreadType(threadId);

    // Nếu ID đến từ resolvedThreadId (nhóm), force ThreadType.Group
    if (payload.resolvedThreadId && threadId === payload.resolvedThreadId) {
      threadType = ThreadType.Group;
      setThreadType(threadId, threadType);
      debugLog('EXECUTOR', `Using ThreadType.Group for resolvedThreadId: ${threadId}`);
    }
    // Nếu ID đến từ resolvedUserId (bạn bè), force ThreadType.User
    else if (payload.resolvedUserId && threadId === payload.resolvedUserId) {
      threadType = ThreadType.User;
      setThreadType(threadId, threadType);
      debugLog('EXECUTOR', `Using ThreadType.User for resolvedUserId: ${threadId}`);
    }
    // Nếu ID đến từ task.targetThreadId (nhóm), force ThreadType.Group
    else if (task.targetThreadId && threadId === task.targetThreadId) {
      threadType = ThreadType.Group;
      setThreadType(threadId, threadType);
      debugLog('EXECUTOR', `Using ThreadType.Group for targetThreadId: ${threadId}`);
    }

    debugLog('EXECUTOR', `ThreadType for ${threadId}: ${threadType}`);

    // Sử dụng shared sendTextMessage để gửi tin nhắn
    // Hỗ trợ đầy đủ: mention [mention:ID:Name], markdown, auto-chunking
    const result = await sendTextMessage(api, payload.message, threadId, {
      source: 'background-agent',
      parseMarkdown: true,
      sendMediaImages: true,
      sendCodeFiles: true,
      sendLinks: true,
    });

    if (!result.success) {
      debugLog('EXECUTOR', `Failed to send message: ${result.error}`);
      return {
        success: false,
        error: result.error || 'Unknown error',
      };
    }

    // Lưu vào sent messages để AI có thể quote và undo
    // CHỈ lưu khi có msgId hợp lệ
    let msgIndex = -1;
    if (result.msgId) {
      msgIndex = saveSentMessage(threadId, result.msgId, '', payload.message.substring(0, 200));
    } else {
      debugLog('EXECUTOR', `Skipped saveSentMessage: no msgId returned from API`);
    }

    // Lưu toàn bộ message vào history để AI nhớ đã gửi tin nhắn này
    await saveResponseToHistory(threadId, payload.message);

    debugLog('EXECUTOR', `Message saved to history and sent_messages (index=${msgIndex})`);
    debugLog('EXECUTOR', `Message sent successfully`);

    return {
      success: true,
      data: {
        msgId: result.msgId,
        threadId,
        msgIndex,
        savedToHistory: true,
        chunks: result.chunks,
      },
    };
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    debugLog('EXECUTOR', `Failed to send message: ${errorMsg}`);

    // Xử lý các lỗi cụ thể từ Zalo API
    if (errorMsg.includes('Không thể nhận tin nhắn từ bạn')) {
      debugLog('EXECUTOR', `Bot cannot send to thread ${threadId} - not a member or blocked`);
      return {
        success: false,
        error: `Không thể gửi tin vào thread ${threadId}: Bot không phải thành viên của nhóm này hoặc đã bị chặn/kick`,
        data: { errorType: 'not_member_or_blocked', threadId },
      };
    }

    if (errorMsg.includes('Nội dung quá dài')) {
      debugLog('EXECUTOR', `Message still too long after chunking`);
      return {
        success: false,
        error: 'Tin nhắn quá dài, không thể gửi',
        data: { errorType: 'message_too_long', threadId },
      };
    }

    if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      debugLog('EXECUTOR', `Rate limited when sending to ${threadId}`);
      return {
        success: false,
        error: 'Bị giới hạn tốc độ gửi tin, vui lòng thử lại sau',
        data: { errorType: 'rate_limited', threadId },
      };
    }

    return { success: false, error: errorMsg };
  }
}
