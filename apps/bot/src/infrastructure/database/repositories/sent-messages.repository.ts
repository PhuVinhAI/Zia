/**
 * Sent Messages Repository - Quản lý nhật ký tin nhắn đã gửi
 * Hỗ trợ tính năng Undo và Quote
 */
import { desc, eq, lt } from 'drizzle-orm';
import { debugLog } from '../../../core/logger/logger.js';
import { nowDate, subtract } from '../../../shared/utils/datetime.js';
import { getDatabase } from '../connection.js';
import { type SentMessage, sentMessages } from '../schema.js';

export class SentMessagesRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Lưu tin nhắn đã gửi
   */
  async saveMessage(data: {
    msgId: string;
    cliMsgId?: string;
    threadId: string;
    content?: string;
  }): Promise<void> {
    await this.db.insert(sentMessages).values({
      msgId: data.msgId,
      cliMsgId: data.cliMsgId || null,
      threadId: data.threadId,
      content: data.content || null,
      timestamp: nowDate(),
    });

    debugLog('SENT_MSG', `Saved message ${data.msgId} for thread ${data.threadId}`);
  }

  /**
   * Lấy tin nhắn gần nhất của một thread (cho Undo)
   */
  async getLastMessage(threadId: string): Promise<SentMessage | null> {
    const result = await this.db
      .select()
      .from(sentMessages)
      .where(eq(sentMessages.threadId, threadId))
      .orderBy(desc(sentMessages.timestamp))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Lấy tin nhắn theo msgId
   */
  async getByMsgId(msgId: string): Promise<SentMessage | null> {
    const result = await this.db
      .select()
      .from(sentMessages)
      .where(eq(sentMessages.msgId, msgId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Lấy tin nhắn theo cliMsgId
   */
  async getByCliMsgId(cliMsgId: string): Promise<SentMessage | null> {
    const result = await this.db
      .select()
      .from(sentMessages)
      .where(eq(sentMessages.cliMsgId, cliMsgId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Xóa tin nhắn (sau khi undo thành công)
   */
  async deleteMessage(msgId: string): Promise<boolean> {
    const result = await this.db
      .delete(sentMessages)
      .where(eq(sentMessages.msgId, msgId))
      .returning();

    return result.length > 0;
  }

  /**
   * Lấy N tin nhắn gần nhất của thread
   */
  async getRecentMessages(threadId: string, limit: number = 10): Promise<SentMessage[]> {
    return await this.db
      .select()
      .from(sentMessages)
      .where(eq(sentMessages.threadId, threadId))
      .orderBy(desc(sentMessages.timestamp))
      .limit(limit);
  }

  /**
   * Cleanup - Xóa tin nhắn cũ hơn 24 giờ
   * Nên chạy định kỳ (cronjob)
   */
  async cleanup(): Promise<number> {
    const cutoff = subtract(nowDate(), 24, 'hour');

    const result = await this.db
      .delete(sentMessages)
      .where(lt(sentMessages.timestamp, cutoff))
      .returning();

    if (result.length > 0) {
      debugLog('SENT_MSG', `Cleaned up ${result.length} old messages`);
    }

    return result.length;
  }
}

// Singleton instance
export const sentMessagesRepository = new SentMessagesRepository();
