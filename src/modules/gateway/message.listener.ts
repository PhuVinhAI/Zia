/**
 * Message Listener - Xử lý sự kiện tin nhắn từ Zalo
 * Tách logic từ main.ts để clean hơn
 */

import { CONFIG } from '../../core/config/config.js';
import { debugLog, Events, eventBus, logMessage } from '../../core/index.js';
import { initThreadHistory, isThreadInitialized } from '../../shared/utils/history/history.js';
import { abortTask } from '../../shared/utils/taskManager.js';
import { isAllowedUser } from './guards/user.filter.js';
import { addToBuffer } from './services/message.buffer.js';

// FriendEventType from zca-js
const FriendEventType = {
  ADD: 0,
  REMOVE: 1,
  REQUEST: 2,
  UNDO_REQUEST: 3,
  REJECT_REQUEST: 4,
  SEEN_FRIEND_REQUEST: 5,
  BLOCK: 6,
  UNBLOCK: 7,
  BLOCK_CALL: 8,
  UNBLOCK_CALL: 9,
  PIN_UNPIN: 10,
  PIN_CREATE: 11,
  UNKNOWN: 12,
} as const;

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

  // Đăng ký friend event listener để auto-accept realtime
  registerFriendEventListener(api);
}

/**
 * Xử lý friend event realtime (auto-accept kết bạn)
 */
function registerFriendEventListener(api: any): void {
  api.listener.on('friend_event', async (event: any) => {
    debugLog('FRIEND_EVENT', `Received: type=${event.type}, data=${JSON.stringify(event.data)}`);

    // Chỉ xử lý REQUEST (type = 2)
    if (event.type !== FriendEventType.REQUEST) {
      return;
    }

    const fromUid = event.data?.fromUid;
    const displayName = event.data?.displayName || event.data?.zaloName || 'Người lạ';

    if (!fromUid) {
      debugLog('FRIEND_EVENT', '⚠️ Không tìm thấy fromUid trong friend request');
      return;
    }

    // Nếu là request từ chính mình gửi đi thì bỏ qua
    if (event.isSelf) {
      debugLog('FRIEND_EVENT', 'Bỏ qua: self request');
      return;
    }

    debugLog('FRIEND_EVENT', `💌 Nhận lời mời kết bạn từ: ${displayName} (${fromUid})`);

    try {
      // Delay ngẫu nhiên 2-5s cho giống người
      const delay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Auto accept
      await api.acceptFriendRequest(fromUid);
      debugLog('FRIEND_EVENT', `✅ Đã chấp nhận kết bạn: ${displayName}`);
      console.log(`[Bot] ✅ Đã chấp nhận kết bạn: ${displayName} (${fromUid})`);
    } catch (error: any) {
      // Mã lỗi 225 = Đã là bạn bè rồi
      if (error.code === 225 || error.message?.includes('225')) {
        debugLog('FRIEND_EVENT', `ℹ️ Đã là bạn bè với ${displayName}`);
      } else {
        debugLog(
          'FRIEND_EVENT',
          `❌ Lỗi accept ${fromUid}: ${error.message} (code: ${error.code})`,
        );
      }
    }
  });

  console.log('[Gateway] 👥 Friend event listener registered (auto-accept enabled)');
}
