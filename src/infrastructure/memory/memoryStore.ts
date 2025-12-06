/**
 * Memory Store - Long-term memory với SQLite-vec + Drizzle
 * Sử dụng chung database với bot (data/bot.db)
 */

import { desc, eq, sql } from 'drizzle-orm';
import { debugLog } from '../../core/logger/logger.js';
import { EMBEDDING_DIM, getDatabase, getSqliteDb } from '../database/connection.js';
import { type Memory, type MemoryType, memories, type NewMemory } from '../database/schema.js';
import { isRateLimitError, keyManager } from '../gemini/keyManager.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const EMBEDDING_MODEL = 'gemini-embedding-001';
const DECAY_HALF_LIFE_DAYS = 30; // Memory giảm 50% importance sau 30 ngày không access
const ACCESS_BOOST_FACTOR = 0.2; // Hệ số boost cho mỗi lần access

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface SearchResult extends Memory {
  distance: number;
  relevance: number; // 0-1, cao = liên quan hơn
  effectiveScore: number; // Score sau khi apply decay + access boost
}

// Re-export types
export type { Memory, MemoryType };

// ═══════════════════════════════════════════════════
// EMBEDDING SERVICE (dùng keyManager để xoay key khi rate limit)
// ═══════════════════════════════════════════════════

class EmbeddingService {
  async createEmbedding(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<Float32Array> {
    // Retry loop với key rotation khi gặp rate limit
    while (true) {
      try {
        const ai = keyManager.getCurrentAI();
        const result = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text,
          config: { taskType, outputDimensionality: EMBEDDING_DIM },
        });

        const values = result.embeddings?.[0]?.values || [];
        // Normalize
        const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
        return new Float32Array(norm > 0 ? values.map((v) => v / norm) : values);
      } catch (error: any) {
        // Rate limit (429) - đổi key và thử lại ngay
        if (isRateLimitError(error)) {
          const rotated = keyManager.handleRateLimitError();
          if (rotated) {
            debugLog(
              'EMBEDDING',
              `Rate limit, đổi sang key #${keyManager.getCurrentKeyIndex()} và thử lại`,
            );
            continue;
          }
        }
        throw error;
      }
    }
  }
}

const embeddingService = new EmbeddingService();

// ═══════════════════════════════════════════════════
// MEMORY STORE CLASS
// ═══════════════════════════════════════════════════

class MemoryStore {
  /**
   * Tính effective score với decay + access boost
   */
  private calculateEffectiveScore(
    importance: number,
    lastAccessedAt: Date | null,
    accessCount: number,
  ): number {
    const now = Date.now();
    const lastAccess = lastAccessedAt?.getTime() || now;
    const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);

    // Decay factor: e^(-t/halfLife), giảm 50% sau DECAY_HALF_LIFE_DAYS ngày
    const decayFactor = Math.exp(-daysSinceAccess / DECAY_HALF_LIFE_DAYS);

    // Access boost: 1 + log(accessCount + 1) * factor
    const accessBoost = 1 + Math.log(accessCount + 1) * ACCESS_BOOST_FACTOR;

    return importance * decayFactor * accessBoost;
  }

  /**
   * Thêm memory mới
   */
  async add(
    content: string,
    options?: {
      type?: MemoryType;
      userId?: string;
      userName?: string;
      importance?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<number> {
    const db = getDatabase();
    const sqlite = getSqliteDb();

    // Insert vào bảng memories với Drizzle
    const newMemory: NewMemory = {
      content,
      type: options?.type || 'note',
      userId: options?.userId || null,
      userName: options?.userName || null,
      importance: options?.importance || 5,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
    };

    const result = await db.insert(memories).values(newMemory).returning({ id: memories.id });
    const memoryId = result[0].id;

    // Tạo embedding và insert vào vec_memories (raw SQL vì virtual table)
    const embedding = await embeddingService.createEmbedding(content, 'RETRIEVAL_DOCUMENT');
    sqlite
      .prepare('INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)')
      .run(memoryId, embedding);

    debugLog('MEMORY', `Added memory #${memoryId}: ${content.substring(0, 50)}...`);
    return memoryId;
  }

  /**
   * Tìm kiếm memories liên quan (semantic search) với decay scoring
   */
  async search(
    query: string,
    options?: {
      limit?: number;
      type?: MemoryType;
      userId?: string;
      minImportance?: number;
    },
  ): Promise<SearchResult[]> {
    const db = getDatabase();
    const sqlite = getSqliteDb();
    const queryEmb = await embeddingService.createEmbedding(query, 'RETRIEVAL_QUERY');
    const limit = options?.limit || 5;

    // KNN search với join (raw SQL vì virtual table)
    let sqlQuery = `
      SELECT
        m.id, m.content, m.type, m.user_id as userId, m.user_name as userName,
        m.importance, m.created_at as createdAt, m.last_accessed_at as lastAccessedAt,
        m.access_count as accessCount, m.metadata, v.distance
      FROM vec_memories v
      LEFT JOIN memories m ON m.id = v.memory_id
      WHERE v.embedding MATCH ? AND k = ?
    `;
    const params: any[] = [queryEmb, limit * 3]; // Fetch more để filter sau khi apply decay

    if (options?.type) {
      sqlQuery += ' AND m.type = ?';
      params.push(options.type);
    }
    if (options?.userId) {
      sqlQuery += ' AND m.user_id = ?';
      params.push(options.userId);
    }
    if (options?.minImportance) {
      sqlQuery += ' AND m.importance >= ?';
      params.push(options.minImportance);
    }

    const rows = sqlite.prepare(sqlQuery).all(...params) as any[];

    // Map và tính effective score
    const results = rows.map((r) => {
      const lastAccessedAt = r.lastAccessedAt ? new Date(r.lastAccessedAt * 1000) : null;
      const effectiveScore = this.calculateEffectiveScore(
        r.importance,
        lastAccessedAt,
        r.accessCount || 0,
      );

      return {
        ...r,
        createdAt: new Date(r.createdAt * 1000),
        lastAccessedAt,
        accessCount: r.accessCount || 0,
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
        relevance: Math.max(0, 1 - r.distance / 2),
        effectiveScore,
      };
    });

    // Sort by combined score (relevance * effectiveScore) và limit
    results.sort((a, b) => b.relevance * b.effectiveScore - a.relevance * a.effectiveScore);
    const topResults = results.slice(0, limit);

    // Update access tracking cho các memories được trả về
    if (topResults.length > 0) {
      const ids = topResults.map((r) => r.id);
      await this.trackAccess(ids);
    }

    return topResults;
  }

  /**
   * Track access cho memories (tăng accessCount, update lastAccessedAt)
   */
  private async trackAccess(ids: number[]): Promise<void> {
    const db = getDatabase();
    const now = new Date();

    for (const id of ids) {
      await db
        .update(memories)
        .set({
          lastAccessedAt: now,
          accessCount: sql`${memories.accessCount} + 1`,
        })
        .where(eq(memories.id, id));
    }
  }

  /**
   * Lấy memories gần đây (dùng Drizzle)
   */
  async getRecent(limit = 10, type?: MemoryType): Promise<Memory[]> {
    const db = getDatabase();

    if (type) {
      return db
        .select()
        .from(memories)
        .where(eq(memories.type, type))
        .orderBy(desc(memories.createdAt))
        .limit(limit);
    }

    return db.select().from(memories).orderBy(desc(memories.createdAt)).limit(limit);
  }

  /**
   * Xóa memory
   */
  async delete(id: number): Promise<void> {
    const db = getDatabase();
    const sqlite = getSqliteDb();

    sqlite.prepare('DELETE FROM vec_memories WHERE memory_id = ?').run(id);
    await db.delete(memories).where(eq(memories.id, id));

    debugLog('MEMORY', `Deleted memory #${id}`);
  }

  /**
   * Cập nhật importance
   */
  async updateImportance(id: number, importance: number): Promise<void> {
    const db = getDatabase();
    await db.update(memories).set({ importance }).where(eq(memories.id, id));
  }

  /**
   * Thống kê
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    avgAccessCount: number;
    staleCount: number; // Memories không được access > 30 ngày
  }> {
    const db = getDatabase();

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(memories);

    const byTypeResult = await db
      .select({
        type: memories.type,
        count: sql<number>`count(*)`,
      })
      .from(memories)
      .groupBy(memories.type);

    const accessStats = await db
      .select({
        avgAccess: sql<number>`avg(access_count)`,
      })
      .from(memories);

    const staleThreshold = Math.floor(Date.now() / 1000) - DECAY_HALF_LIFE_DAYS * 24 * 60 * 60;
    const staleResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(memories)
      .where(
        sql`${memories.lastAccessedAt} < ${staleThreshold} OR ${memories.lastAccessedAt} IS NULL`,
      );

    return {
      total: totalResult[0]?.count || 0,
      byType: Object.fromEntries(byTypeResult.map((r) => [r.type, r.count])),
      avgAccessCount: Math.round((accessStats[0]?.avgAccess || 0) * 10) / 10,
      staleCount: staleResult[0]?.count || 0,
    };
  }
}

// Singleton export
export const memoryStore = new MemoryStore();
