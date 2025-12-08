/**
 * Message Listener - Xử lý sự kiện tin nhắn từ Zalo
 * Tách logic từ main.ts để clean hơn
 */

import { CONFIG } from '../../core/config/config.js';
import { debugLog, Events, eventBus, logMessage } from '../../core/index.js';
import { initThreadHistory, isThreadInitialized } from '../../shared/utils/history/history.js';
import { getBotMessageByMsgId, getLastBotMessageInThread } from '../../shared/utils/message/messageStore.js';
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

  // Đăng ký reaction listener
  registerReactionListener(api);
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

// Mapping reaction icons to readable names
const REACTION_NAMES: Record<string, string> = {
  '/-heart': 'tim ❤️',
  '/-strong': 'like 👍',
  '/-weak': 'dislike 👎',
  ':>': 'haha 😆',
  ':o': 'wow 😮',
  ':-((': 'buồn 😢',
  ':-h': 'phẫn nộ 😡',
};

// Track pending reactions để debounce khi user thả nhiều reaction liên tục
// Key: `${threadId}:${reactorId}:${originalMsgId}`, Value: { timeout, icons: string[] }
const pendingReactions = new Map<string, { timeout: NodeJS.Timeout; icons: string[] }>();
const REACTION_DEBOUNCE_MS = 2000; // Đợi 2s trước khi xử lý reaction

/**
 * Xử lý reaction event - tạo fake message để AI tự suy nghĩ phản hồi
 * Có debounce để gom tất cả reactions trong 2s thành danh sách
 */
function registerReactionListener(api: any): void {
  api.listener.on('reaction', async (reactionObj: any) => {
    // Log toàn bộ reaction object để debug
    debugLog('REACTION', `RAW event: ${JSON.stringify(reactionObj)}`);
    
    const { data, threadId, isSelf } = reactionObj;

    // Bỏ qua reaction của chính bot
    if (isSelf) {
      debugLog('REACTION', 'Ignoring self reaction (isSelf=true)');
      return;
    }

    const reactorId = data?.uidFrom;
    const icon = data?.content?.rIcon;
    // Zalo có thể dùng nhiều loại msgId khác nhau
    const targetMsgId = data?.msgId;
    const oriMsgId = data?.content?.oriMsgId; // Original message ID
    const cliMsgId = data?.content?.cliMsgId; // Client message ID
    const globalMsgId = data?.content?.globalMsgId; // Global message ID
    // rMsg array chứa thông tin tin nhắn gốc được react - ĐÂY LÀ ID CHÍNH XÁC NHẤT
    const rMsgGlobalId = data?.content?.rMsg?.[0]?.gMsgID; // Global msg ID từ rMsg
    const rMsgCliId = data?.content?.rMsg?.[0]?.cMsgID; // Client msg ID từ rMsg

    if (!reactorId || !icon) {
      debugLog('REACTION', 'Missing reactorId or icon in reaction event');
      return;
    }

    // Log tất cả các loại msgId để debug
    debugLog(
      'REACTION',
      `User ${reactorId} reacted ${icon} - msgId=${targetMsgId}, rMsgGlobalId=${rMsgGlobalId}, rMsgCliId=${rMsgCliId}, oriMsgId=${oriMsgId} in ${threadId}`,
    );

    // Thử tìm tin nhắn bot với tất cả các loại ID có thể
    // Ưu tiên rMsgGlobalId vì đây là ID chính xác của tin nhắn được react
    const possibleIds = [rMsgGlobalId, rMsgCliId, targetMsgId, oriMsgId, cliMsgId, globalMsgId]
      .filter((id) => id != null)
      .map((id) => String(id));

    let botMsg = null;
    let matchedId = null;
    
    for (const id of possibleIds) {
      botMsg = await getBotMessageByMsgId(id);
      if (botMsg) {
        matchedId = id;
        debugLog('REACTION', `Found bot message with ID: ${id}`);
        break;
      }
    }
    
    // Nếu không tìm thấy theo ID, thử tìm tin nhắn gần nhất của bot trong thread
    if (!botMsg) {
      botMsg = await getLastBotMessageInThread(threadId);
      if (botMsg) {
        debugLog('REACTION', `Found recent bot message in thread: ${botMsg.msgId}`);
      }
    }
    
    if (!botMsg) {
      debugLog('REACTION', `Not a bot message (tried IDs: ${possibleIds.join(', ')}), ignoring`);
      return;
    }

    // Lấy tên reaction
    const reactionName = REACTION_NAMES[icon] || icon;
    
    // Key để track reaction: threadId:reactorId:originalMsgId
    const reactionKey = `${threadId}:${reactorId}:${botMsg.msgId}`;
    const pending = pendingReactions.get(reactionKey);
    
    // Nếu đã có pending reaction cho cùng tin nhắn, clear timeout cũ và thêm icon mới vào danh sách
    if (pending) {
      clearTimeout(pending.timeout);
      pending.icons.push(icon);
      debugLog('REACTION', `User added another reaction: ${icon} (total: ${pending.icons.length})`);
    }
    
    // Lấy danh sách icons hiện tại hoặc tạo mới
    const icons = pending?.icons || [icon];
    
    // Debounce: đợi 2s trước khi xử lý để gom tất cả reactions
    const newPending = {
      timeout: setTimeout(async () => {
        pendingReactions.delete(reactionKey);
        
        // Chuyển danh sách icons thành tên reactions
        const reactionNames = icons.map(i => REACTION_NAMES[i] || i);
        const uniqueReactions = [...new Set(reactionNames)];
        const reactionList = reactionNames.join(', ');
        
        // Tạo nội dung mô tả reaction để AI hiểu context
        // Nhấn mạnh đây là reaction LÊN TIN NHẮN chứ không phải cảm xúc cá nhân
        let reactionContent: string;
        const msgPreview = botMsg.content.substring(0, 150) + (botMsg.content.length > 150 ? '...' : '');
        if (icons.length > 1) {
          reactionContent = `[REACTION] Người dùng vừa thả ${icons.length} reaction lên tin nhắn của bạn: [${reactionList}]. Tin nhắn được react: "${msgPreview}"`;
        } else {
          reactionContent = `[REACTION] Người dùng vừa thả reaction "${reactionNames[0]}" lên tin nhắn của bạn: "${msgPreview}"`;
        }

        // Tạo fake message để đẩy vào luồng xử lý chung
        const fakeMessage = {
          type: 'reaction',
          threadId,
          isSelf: false,
          data: {
            uidFrom: reactorId,
            content: reactionContent,
            msgType: 'chat',
            // Metadata để AI biết đây là reaction event
            _isReaction: true,
            _reactionIcons: icons, // Danh sách tất cả icons
            _reactionNames: reactionNames, // Danh sách tên reactions
            _originalMsgContent: botMsg.content,
            _originalMsgId: botMsg.msgId,
          },
        };

        debugLog('REACTION', `Processing ${icons.length} reactions after debounce: ${reactionList}`);

        // Đẩy vào buffer để AI xử lý như tin nhắn bình thường
        addToBuffer(api, threadId, fakeMessage);
      }, REACTION_DEBOUNCE_MS),
      icons,
    };
    
    pendingReactions.set(reactionKey, newPending);
    debugLog('REACTION', `Queued reaction (will process in ${REACTION_DEBOUNCE_MS}ms): ${reactionName}`);
  });

  console.log('[Gateway] 💝 Reaction listener registered');
}
