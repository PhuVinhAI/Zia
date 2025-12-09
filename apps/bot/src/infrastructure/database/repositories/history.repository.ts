/**
 * History Repository - Quản lý lịch sử hội thoại
 * Hỗ trợ context window cho AI với cơ chế pruning
 */
import { asc, desc, eq } from 'drizzle-orm';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog } from '../../../core/logger/logger.js';
import { nowDate } from '../../../shared/utils/datetime.js';
import { getDatabase } from '../connection.js';
import { type History, history } from '../schema.js';

// Giới hạn token từ config
const getMaxContextTokens = () => CONFIG.history?.maxContextTokens ?? 300000;
const getEstimatedCharsPerToken = () => CONFIG.history?.estimatedCharsPerToken ?? 4;

export class HistoryRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Thêm tin nhắn vào lịch sử
   * Tự động serialize complex data thành JSON
   */
  async addMessage(
    threadId: string,
    role: 'user' | 'model',
    content: string | object,
  ): Promise<void> {
    const serializedContent = typeof content === 'string' ? content : JSON.stringify(content);

    await this.db.insert(history).values({
      threadId,
      role,
      content: serializedContent,
      timestamp: nowDate(),
    });

    // Pruning: Cắt tỉa nếu vượt quá giới hạn
    await this.pruneIfNeeded(threadId);

    debugLog('HISTORY', `Added ${role} message for thread ${threadId}`);
  }

  /**
   * Lấy lịch sử hội thoại theo thread
   * Sắp xếp theo thời gian tăng dần
   */
  async getHistory(threadId: string, limit?: number): Promise<History[]> {
    const query = this.db
      .select()
      .from(history)
      .where(eq(history.threadId, threadId))
      .orderBy(asc(history.timestamp));

    if (limit) {
      // Lấy N tin nhắn gần nhất
      const recent = await this.db
        .select()
        .from(history)
        .where(eq(history.threadId, threadId))
        .orderBy(desc(history.timestamp))
        .limit(limit);
      return recent.reverse();
    }

    return await query;
  }

  /**
   * Lấy lịch sử và parse JSON content
   * Trả về format phù hợp cho AI SDK
   */
  async getHistoryForAI(
    threadId: string,
  ): Promise<Array<{ role: 'user' | 'model'; parts: any[] }>> {
    const records = await this.getHistory(threadId);

    return records.map((record) => {
      let parts: any[];
      try {
        // Thử parse JSON
        const parsed = JSON.parse(record.content);
        parts = Array.isArray(parsed) ? parsed : [{ text: record.content }];
      } catch {
        // Plain text
        parts = [{ text: record.content }];
      }

      return {
        role: record.role,
        parts,
      };
    });
  }

  /**
   * Xóa lịch sử của một thread
   */
  async clearHistory(threadId: string): Promise<number> {
    const result = await this.db.delete(history).where(eq(history.threadId, threadId)).returning();

    debugLog('HISTORY', `Cleared ${result.length} messages for ${threadId}`);
    return result.length;
  }

  /**
   * Cơ chế Pruning - Xóa tin nhắn cũ khi vượt quá giới hạn token
   */
  private async pruneIfNeeded(threadId: string): Promise<void> {
    const records = await this.getHistory(threadId);

    // Ước tính tổng token
    const totalChars = records.reduce((sum, r) => sum + r.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / getEstimatedCharsPerToken());

    if (estimatedTokens > getMaxContextTokens()) {
      // Xóa 20% tin nhắn cũ nhất
      const deleteCount = Math.ceil(records.length * 0.2);
      const oldestIds = records.slice(0, deleteCount).map((r) => r.id);

      for (const id of oldestIds) {
        await this.db.delete(history).where(eq(history.id, id));
      }

      debugLog(
        'HISTORY',
        `Pruned ${deleteCount} old messages for ${threadId} (tokens: ${estimatedTokens})`,
      );
    }
  }

  /**
   * Đếm số tin nhắn của một thread
   */
  async countMessages(threadId: string): Promise<number> {
    const records = await this.db.select().from(history).where(eq(history.threadId, threadId));
    return records.length;
  }
}

// Singleton instance
export const historyRepository = new HistoryRepository();
