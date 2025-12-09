/**
 * History API - Quản lý lịch sử hội thoại
 */
import { Hono } from 'hono';
import { getDatabase, getSqliteDb } from '../database/connection.js';
import { history } from '../database/schema.js';
import { eq, desc, count, and, gte, lte } from 'drizzle-orm';

export const historyApi = new Hono();

// GET /history - Danh sách history với filter
historyApi.get('/', async (c) => {
  try {
    const db = getDatabase();
    const page = Number(c.req.query('page')) || 1;
    const limit = Math.min(Number(c.req.query('limit')) || 50, 200);
    const threadId = c.req.query('threadId');
    const role = c.req.query('role');
    const offset = (page - 1) * limit;

    let query = db.select().from(history);

    // Filter by threadId
    if (threadId) {
      query = query.where(eq(history.threadId, threadId)) as typeof query;
    }

    // Filter by role
    if (role && ['user', 'model'].includes(role)) {
      query = query.where(eq(history.role, role as 'user' | 'model')) as typeof query;
    }

    const data = await query.orderBy(desc(history.timestamp)).limit(limit).offset(offset);

    // Count total
    let countQuery = db.select({ count: count() }).from(history);
    if (threadId) {
      countQuery = countQuery.where(eq(history.threadId, threadId)) as typeof countQuery;
    }
    const [total] = await countQuery;

    return c.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit),
      },
    });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /history/threads - Danh sách threads
historyApi.get('/threads', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit')) || 50, 200);
    const sqlite = getSqliteDb();

    const result = sqlite
      .query(
        `
      SELECT 
        thread_id,
        COUNT(*) as message_count,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM history 
      GROUP BY thread_id
      ORDER BY last_message DESC
      LIMIT ?
    `,
      )
      .all(limit) as {
      thread_id: string;
      message_count: number;
      first_message: number;
      last_message: number;
    }[];

    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /history/thread/:threadId - Lấy history của một thread
historyApi.get('/thread/:threadId', async (c) => {
  try {
    const db = getDatabase();
    const threadId = c.req.param('threadId');
    const limit = Math.min(Number(c.req.query('limit')) || 100, 500);

    const data = await db
      .select()
      .from(history)
      .where(eq(history.threadId, threadId))
      .orderBy(desc(history.timestamp))
      .limit(limit);

    return c.json({ success: true, data: data.reverse() }); // Reverse để oldest first
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// DELETE /history/thread/:threadId - Xóa history của một thread
historyApi.delete('/thread/:threadId', async (c) => {
  try {
    const db = getDatabase();
    const threadId = c.req.param('threadId');

    const result = await db.delete(history).where(eq(history.threadId, threadId));

    return c.json({ success: true, message: `History for thread ${threadId} deleted` });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// DELETE /history/old - Xóa history cũ hơn X ngày
historyApi.delete('/old', async (c) => {
  try {
    const db = getDatabase();
    const days = Number(c.req.query('days')) || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const sqlite = getSqliteDb();
    const result = sqlite.run(`DELETE FROM history WHERE timestamp < ?`, [cutoff]);

    return c.json({
      success: true,
      message: `Deleted history older than ${days} days`,
      deleted: result.changes,
    });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
