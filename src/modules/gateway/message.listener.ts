/**
 * Message Listener - Xử lý sự kiện tin nhắn từ Zalo
 * Tách logic từ main.ts để clean hơn
 */

import { debugLog, Events, eventBus, logMessage } from '../../core/index.js';
import { CONFIG } from '../../shared/constants/config.js';
import { initThreadHistory, isThreadInitialized } from '../../shared/utils/history.js';
import { abortTask } from '../../shared/utils/taskManager.js';
import { addToBuffer } from './message.buffer.js';
import { isAllowedUser } from './user.filter.js';

export interface MessageListenerOptions {
  isCloudMessage: (message: any) => boolean;
  processCloudMessage: (message: any) => void;
  shouldSkipMessage: (message: any) => { skip: boolean; reason?: string };
}

/**
 * Tạo message handler cho Zalo API
 */
export function createMessageHandler(api: any, options: MessageListenerOptions) {
  const { isCloudMessage, processCloudMessage, shouldSkipMessage } = options;

  return async (message: any) => {
    const threadId = message.threadId;

    // Log RAW message
    if (CONFIG.fileLogging) {
      logMessage('IN', threadId, message);
    }

    // Emit message received event
    await eventBus.emit(Events.MESSAGE_RECEIVED, { threadId, message });

    // Kiểm tra Cloud Debug
    const cloudMessage = isCloudMessage(message);
    if (cloudMessage) {
      processCloudMessage(message);
    }

    // Kiểm tra bỏ qua
    const { skip, reason } = shouldSkipMessage(message);
    if (skip && !cloudMessage) {
      if (reason === 'group message') {
        console.log(`[Bot] 🚫 Bỏ qua tin nhắn nhóm: ${threadId}`);
      }
      debugLog('MSG', `Skipping: ${reason}, thread=${threadId}`);
      return;
    }

    // Kiểm tra user được phép
    const senderId = message.data?.uidFrom || threadId;
    const senderName = message.data?.dName || '';

    if (!cloudMessage && !isAllowedUser(senderId, senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}" (${senderId})`);
      return;
    }

    // Khởi tạo history
    const msgType = message.type;
    if (!isThreadInitialized(threadId)) {
      debugLog('MSG', `Initializing history for thread: ${threadId}`);
      await initThreadHistory(api, threadId, msgType);
    }

    // Hủy task đang chạy nếu có
    abortTask(threadId);

    // Thêm vào buffer
    addToBuffer(api, threadId, message);
  };
}

/**
 * Đăng ký message listener cho Zalo API
 */
export function registerMessageListener(api: any, options: MessageListenerOptions): void {
  const handler = createMessageHandler(api, options);
  api.listener.on('message', handler);
  console.log('[Gateway] 📨 Message listener registered');
}
