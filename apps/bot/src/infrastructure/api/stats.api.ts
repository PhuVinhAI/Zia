/**
 * Stats API - Thống kê hệ thống cho Dashboard
 */
import { Hono } from 'hono';
import { getDatabase, getSqliteDb } from '../database/connection.js';
import { history } from '../database/schema.js';
import { count, sql } from 'drizzle-orm';

export const statsApi = new Hono();

// GET /stats/overview - Tổng quan hệ thống
statsApi.get('/overview', async (c) => {
  try {
    const db = getDatabase();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Đếm tổng số
    const [totalMessages] = await db.select({ count: count() }).from(history);

    // Đếm trong 24h
    const [messagesLast24h] = await db
      .select({ count: count() })
      .from(history)
      .where(sql`${history.timestamp} > ${oneDayAgo}`);

    // Uptime
    const startTime = process.uptime();

    return c.json({
      success: true,
      data: {
        messages: totalMessages.count,
        messagesLast24h: messagesLast24h.count,
        uptime: Math.floor(startTime),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /stats/messages - Thống kê tin nhắn theo thời gian
statsApi.get('/messages', async (c) => {
  try {
    const db = getDatabase();
    const days = Number(c.req.query('days')) || 7;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Group by ngày
    const sqlite = getSqliteDb();
    const result = sqlite
      .query(
        `
      SELECT
        date(timestamp/1000, 'unixepoch') as date,
        role,
        COUNT(*) as count
      FROM history
      WHERE timestamp > ?
      GROUP BY date, role
      ORDER BY date DESC
    `,
      )
      .all(startTime) as { date: string; role: string; count: number }[];

    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /stats/active-threads - Top threads hoạt động
statsApi.get('/active-threads', async (c) => {
  try {
    const limit = Number(c.req.query('limit')) || 10;
    const sqlite = getSqliteDb();

    const result = sqlite
      .query(
        `
      SELECT
        thread_id,
        COUNT(*) as message_count,
        MAX(timestamp) as last_activity
      FROM history
      GROUP BY thread_id
      ORDER BY message_count DESC
      LIMIT ?
    `,
      )
      .all(limit) as { thread_id: string; message_count: number; last_activity: number }[];

    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
