/**
 * Lưu trữ tin nhắn đã gửi để có thể thu hồi
 * Sử dụng SQLite database thay vì in-memory Map
 */
import { debugLog } from '../../../core/logger/logger.js';
import { sentMessagesRepository } from '../../../infrastructure/database/index.js';

interface SentMessage {
  msgId: string;
  cliMsgId: string;
  content: string;
  threadId: string;
  timestamp: number;
}

// In-memory cache để truy xuất nhanh theo index
const messageCache = new Map<string, SentMessage[]>();
const MAX_CACHE_PER_THREAD = 20;

/**
 * Lưu tin nhắn đã gửi (vào cả DB và cache)
 */
export function saveSentMessage(
  threadId: string,
  msgId: string,
  cliMsgId: string,
  content: string,
): number {
  const msg: SentMessage = {
    msgId,
    cliMsgId,
    content,
    threadId,
    timestamp: Date.now(),
  };

  // Lưu vào cache
  if (!messageCache.has(threadId)) {
    messageCache.set(threadId, []);
  }
  const cache = messageCache.get(threadId)!;
  cache.push(msg);
  if (cache.length > MAX_CACHE_PER_THREAD) {
    cache.shift();
  }

  // Lưu vào database (async, không block)
  // CHỈ lưu khi có msgId hợp lệ để tránh lỗi UNIQUE constraint
  if (msgId && msgId.trim() !== '') {
    sentMessagesRepository
      .saveMessage({ msgId, cliMsgId, threadId, content })
      .catch((err) => debugLog('MSG_STORE', `DB save error: ${err}`));
  } else {
    debugLog('MSG_STORE', `Skipped DB save: empty msgId for thread=${threadId}`);
  }

  debugLog('MSG_STORE', `Saved: thread=${threadId}, msgId=${msgId}, index=${cache.length - 1}`);

  return cache.length - 1;
}

/**
 * Lấy tin nhắn theo index (0 = cũ nhất, -1 = mới nhất)
 */
export function getSentMessage(threadId: string, index: number): SentMessage | null {
  const cache = messageCache.get(threadId);
  if (!cache || cache.length === 0) {
    debugLog('MSG_STORE', `getSentMessage: thread=${threadId} has no messages`);
    return null;
  }

  const actualIndex = index < 0 ? cache.length + index : index;

  if (actualIndex < 0 || actualIndex >= cache.length) {
    debugLog('MSG_STORE', `getSentMessage: index ${index} out of range [0, ${cache.length - 1}]`);
    return null;
  }

  const msg = cache[actualIndex];
  debugLog('MSG_STORE', `getSentMessage: found msgId=${msg.msgId}`);
  return msg;
}

/**
 * Lấy tin nhắn mới nhất của thread (async, từ DB)
 */
export async function getLastSentMessage(threadId: string): Promise<SentMessage | null> {
  // Thử cache trước
  const cache = messageCache.get(threadId);
  if (cache && cache.length > 0) {
    return cache[cache.length - 1];
  }

  // Fallback to DB
  const dbMsg = await sentMessagesRepository.getLastMessage(threadId);
  if (dbMsg) {
    return {
      msgId: dbMsg.msgId,
      cliMsgId: dbMsg.cliMsgId || '',
      content: dbMsg.content || '',
      threadId: dbMsg.threadId,
      timestamp: dbMsg.timestamp.getTime(),
    };
  }

  return null;
}

/**
 * Xóa tin nhắn khỏi store sau khi thu hồi
 */
export function removeSentMessage(threadId: string, msgId: string): void {
  // Xóa khỏi cache
  const cache = messageCache.get(threadId);
  if (cache) {
    const index = cache.findIndex((m) => m.msgId === msgId);
    if (index !== -1) {
      cache.splice(index, 1);
    }
  }

  // Xóa khỏi DB (async)
  sentMessagesRepository
    .deleteMessage(msgId)
    .catch((err) => debugLog('MSG_STORE', `DB delete error: ${err}`));

  debugLog('MSG_STORE', `removeSentMessage: removed msgId=${msgId}`);
}

/**
 * Clear tin nhắn cũ - giờ được xử lý bởi database service cleanup job
 */
export function cleanupOldMessages(): void {
  // Cache cleanup
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let totalRemoved = 0;

  for (const [threadId, messages] of messageCache) {
    const beforeCount = messages.length;
    const filtered = messages.filter((m) => m.timestamp > oneHourAgo);
    totalRemoved += beforeCount - filtered.length;

    if (filtered.length === 0) {
      messageCache.delete(threadId);
    } else {
      messageCache.set(threadId, filtered);
    }
  }

  if (totalRemoved > 0) {
    debugLog('MSG_STORE', `Cache cleanup: removed ${totalRemoved} old messages`);
  }
}

// Cleanup cache mỗi 30 phút (DB cleanup được xử lý bởi database.service)
setInterval(cleanupOldMessages, 30 * 60 * 1000);

/**
 * Kiểm tra xem msgId có phải tin nhắn của bot không
 */
export async function isBotMessage(msgId: string): Promise<boolean> {
  // Check cache trước
  for (const messages of messageCache.values()) {
    if (messages.some((m) => m.msgId === msgId)) {
      return true;
    }
  }

  // Fallback to DB
  const dbMsg = await sentMessagesRepository.getByMsgId(msgId);
  return dbMsg !== null;
}

/**
 * Lấy tin nhắn của bot theo msgId (để biết nội dung tin nhắn bị react)
 */
export async function getBotMessageByMsgId(msgId: string): Promise<SentMessage | null> {
  // Check cache trước
  for (const messages of messageCache.values()) {
    const found = messages.find((m) => m.msgId === msgId);
    if (found) return found;
  }

  // Fallback to DB
  const dbMsg = await sentMessagesRepository.getByMsgId(msgId);
  if (dbMsg) {
    return {
      msgId: dbMsg.msgId,
      cliMsgId: dbMsg.cliMsgId || '',
      content: dbMsg.content || '',
      threadId: dbMsg.threadId,
      timestamp: dbMsg.timestamp.getTime(),
    };
  }

  return null;
}
