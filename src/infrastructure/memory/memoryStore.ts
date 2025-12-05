/**
 * Memory Store - Long-term memory với SQLite-vec + Drizzle
 * Sử dụng chung database với bot (data/bot.db)
 */

import { desc, eq, sql } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { debugLog } from '../../core/logger/logger.js';
import { EMBEDDING_DIM, getDatabase, getSqliteDb } from '../database/connection.js';
import { memories, type Memory, type MemoryType, type NewMemory } from '../database/schema.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const EMBEDDING_MODEL = 'gemini-embedding-001';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface SearchResult extends Memory {
  distance: number;
  relevance: number; // 0-1, cao = liên quan hơn
}

// Re-export types
export type { Memory, MemoryType };

// ═══════════════════════════════════════════════════
// EMBEDDING SERVICE
// ═══════════════════════════════════════════════════

class EmbeddingService {
  private ai: GoogleGenAI | null = null;

  private getAI(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = Bun.env.GEMINI_API_KEY?.split(',')[0]?.trim();
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  async createEmbedding(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<Float32Array> {
    const result = await this.getAI().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { taskType, outputDimensionality: EMBEDDING_DIM },
    });

    const values = result.embeddings?.[0]?.values || [];
    // Normalize
    const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    return new Float32Array(norm > 0 ? values.map((v) => v / norm) : values);
  }
}

const embeddingService = new EmbeddingService();

// ═══════════════════════════════════════════════════
// MEMORY STORE CLASS
// ═══════════════════════════════════════════════════

class MemoryStore {
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
    sqlite.prepare('INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)').run(memoryId, embedding);

    debugLog('MEMORY', `Added memory #${memoryId}: ${content.substring(0, 50)}...`);
    return memoryId;
  }

  /**
   * Tìm kiếm memories liên quan (semantic search)
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
    const sqlite = getSqliteDb();
    const queryEmb = await embeddingService.createEmbedding(query, 'RETRIEVAL_QUERY');
    const limit = options?.limit || 5;

    // KNN search với join (raw SQL vì virtual table)
    let sqlQuery = `
      SELECT
        m.id, m.content, m.type, m.user_id as userId, m.user_name as userName,
        m.importance, m.created_at as createdAt, m.metadata, v.distance
      FROM vec_memories v
      LEFT JOIN memories m ON m.id = v.memory_id
      WHERE v.embedding MATCH ? AND k = ?
    `;
    const params: any[] = [queryEmb, limit * 2];

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

    sqlQuery += ' ORDER BY v.distance LIMIT ?';
    params.push(limit);

    const rows = sqlite.prepare(sqlQuery).all(...params) as any[];

    return rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt * 1000),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      relevance: Math.max(0, 1 - r.distance / 2),
    }));
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
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    const db = getDatabase();

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(memories);

    const byTypeResult = await db
      .select({
        type: memories.type,
        count: sql<number>`count(*)`,
      })
      .from(memories)
      .groupBy(memories.type);

    return {
      total: totalResult[0]?.count || 0,
      byType: Object.fromEntries(byTypeResult.map((r) => [r.type, r.count])),
    };
  }
}

// Singleton export
export const memoryStore = new MemoryStore();
