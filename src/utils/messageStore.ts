/**
 * Lưu trữ tin nhắn đã gửi để có thể thu hồi
 */
import { debugLog } from "./logger.js";

interface SentMessage {
  msgId: string;
  cliMsgId: string;
  content: string;
  threadId: string;
  timestamp: number;
}

// Lưu tin nhắn đã gửi theo threadId -> array of messages
const sentMessages = new Map<string, SentMessage[]>();

// Giới hạn số tin nhắn lưu mỗi thread
const MAX_MESSAGES_PER_THREAD = 20;

/**
 * Lưu tin nhắn đã gửi
 */
export function saveSentMessage(
  threadId: string,
  msgId: string,
  cliMsgId: string,
  content: string
): number {
  if (!sentMessages.has(threadId)) {
    sentMessages.set(threadId, []);
  }

  const messages = sentMessages.get(threadId)!;
  messages.push({
    msgId,
    cliMsgId,
    content,
    threadId,
    timestamp: Date.now(),
  });

  // Giới hạn số lượng
  if (messages.length > MAX_MESSAGES_PER_THREAD) {
    messages.shift();
  }

  debugLog(
    "MSG_STORE",
    `Saved: thread=${threadId}, msgId=${msgId}, index=${
      messages.length - 1
    }, content="${content.substring(0, 50)}..."`
  );

  // Trả về index của tin nhắn vừa lưu
  return messages.length - 1;
}

/**
 * Lấy tin nhắn theo index (0 = tin nhắn cũ nhất, -1 = tin nhắn mới nhất)
 */
export function getSentMessage(
  threadId: string,
  index: number
): SentMessage | null {
  const messages = sentMessages.get(threadId);
  if (!messages || messages.length === 0) return null;

  // Hỗ trợ index âm (-1 = cuối cùng)
  const actualIndex = index < 0 ? messages.length + index : index;

  if (actualIndex < 0 || actualIndex >= messages.length) return null;
  return messages[actualIndex];
}

/**
 * Xóa tin nhắn khỏi store sau khi thu hồi
 */
export function removeSentMessage(threadId: string, msgId: string): void {
  const messages = sentMessages.get(threadId);
  if (!messages) return;

  const index = messages.findIndex((m) => m.msgId === msgId);
  if (index !== -1) {
    messages.splice(index, 1);
  }
}

/**
 * Lấy tất cả tin nhắn đã gửi của một thread
 */
export function getAllSentMessages(threadId: string): SentMessage[] {
  return sentMessages.get(threadId) || [];
}

/**
 * Clear tin nhắn cũ (quá 1 giờ)
 */
export function cleanupOldMessages(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [threadId, messages] of sentMessages) {
    const filtered = messages.filter((m) => m.timestamp > oneHourAgo);
    if (filtered.length === 0) {
      sentMessages.delete(threadId);
    } else {
      sentMessages.set(threadId, filtered);
    }
  }
}

// Cleanup mỗi 30 phút
setInterval(cleanupOldMessages, 30 * 60 * 1000);
