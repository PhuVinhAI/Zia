/**
 * Memories API - Quản lý long-term memory
 */
import { Hono } from 'hono';
import { getDatabase } from '../database/connection.js';
import { memories } from '../database/schema.js';
import { eq, desc, count, like, or } from 'drizzle-orm';
import { z } from 'zod';

export const memoriesApi = new Hono();

// Schema validation
const CreateMemorySchema = z.object({
  content: z.string().min(1),
  type: z.enum(['conversation', 'fact', 'person', 'preference', 'task', 'note']).default('note'),
  userId: z.string().optional(),
  userName: z.string().optional(),
  importance: z.number().min(1).max(10).default(5),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateMemorySchema = CreateMemorySchema.partial();

// GET /memories - Danh sách memories với filter
memoriesApi.get('/', async (c) => {
  try {
    const db = getDatabase();
    const page = Number(c.req.query('page')) || 1;
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    const type = c.req.query('type');
    const userId = c.req.query('userId');
    const search = c.req.query('search');
    const offset = (page - 1) * limit;

    let query = db.select().from(memories);

    // Filter by type
    if (
      type &&
      ['conversation', 'fact', 'person', 'preference', 'task', 'note'].includes(type)
    ) {
      query = query.where(
        eq(memories.type, type as 'conversation' | 'fact' | 'person' | 'preference' | 'task' | 'note'),
      ) as typeof query;
    }

    // Filter by userId
    if (userId) {
      query = query.where(eq(memories.userId, userId)) as typeof query;
    }

    // Search in content
    if (search) {
      query = query.where(like(memories.content, `%${search}%`)) as typeof query;
    }

    const data = await query.orderBy(desc(memories.createdAt)).limit(limit).offset(offset);

    // Count total
    const [total] = await db.select({ count: count() }).from(memories);

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

// GET /memories/stats - Thống kê memories theo type
memoriesApi.get('/stats', async (c) => {
  try {
    const db = getDatabase();

    const stats = await db
      .select({
        type: memories.type,
        count: count(),
      })
      .from(memories)
      .groupBy(memories.type);

    return c.json({ success: true, data: stats });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// GET /memories/:id - Chi tiết memory
memoriesApi.get('/:id', async (c) => {
  try {
    const db = getDatabase();
    const memoryId = Number(c.req.param('id'));

    const [memory] = await db.select().from(memories).where(eq(memories.id, memoryId));

    if (!memory) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    return c.json({ success: true, data: memory });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /memories - Tạo memory mới
memoriesApi.post('/', async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();

    const parsed = CreateMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid data', details: parsed.error.issues }, 400);
    }

    const result = await db
      .insert(memories)
      .values({
        content: parsed.data.content,
        type: parsed.data.type,
        userId: parsed.data.userId,
        userName: parsed.data.userName,
        importance: parsed.data.importance,
        metadata: parsed.data.metadata ? JSON.stringify(parsed.data.metadata) : null,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      })
      .returning();

    return c.json({ success: true, data: result[0] }, 201);
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// PATCH /memories/:id - Cập nhật memory
memoriesApi.patch('/:id', async (c) => {
  try {
    const db = getDatabase();
    const memoryId = Number(c.req.param('id'));
    const body = await c.req.json();

    const parsed = UpdateMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid data', details: parsed.error.issues }, 400);
    }

    const [existing] = await db.select().from(memories).where(eq(memories.id, memoryId));
    if (!existing) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.metadata) {
      updateData.metadata = JSON.stringify(parsed.data.metadata);
    }

    await db.update(memories).set(updateData).where(eq(memories.id, memoryId));

    const [updated] = await db.select().from(memories).where(eq(memories.id, memoryId));

    return c.json({ success: true, data: updated });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// DELETE /memories/:id - Xóa memory
memoriesApi.delete('/:id', async (c) => {
  try {
    const db = getDatabase();
    const memoryId = Number(c.req.param('id'));

    await db.delete(memories).where(eq(memories.id, memoryId));

    return c.json({ success: true, message: 'Memory deleted' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
