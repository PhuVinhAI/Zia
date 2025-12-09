/**
 * Tasks API - Quản lý background tasks
 */
import { Hono } from 'hono';
import { getDatabase } from '../database/connection.js';
import { agentTasks } from '../database/schema.js';
import { eq, desc, count, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

export const tasksApi = new Hono();

// Schema validation
const CreateTaskSchema = z.object({
  type: z.enum(['send_message']),
  targetUserId: z.string().optional(),
  targetThreadId: z.string().optional(),
  payload: z.object({
    message: z.string().optional(),
  }),
  context: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /tasks - Danh sách tasks với filter
tasksApi.get('/', async (c) => {
  try {
    const db = getDatabase();
    const page = Number(c.req.query('page')) || 1;
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    const status = c.req.query('status');
    const type = c.req.query('type');
    const offset = (page - 1) * limit;

    let query = db.select().from(agentTasks);

    // Filter by status
    if (status && ['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
      query = query.where(
        eq(agentTasks.status, status as 'pending' | 'processing' | 'completed' | 'failed'),
      ) as typeof query;
    }

    // Filter by type
    if (type && ['send_message'].includes(type)) {
      query = query.where(eq(agentTasks.type, type as 'send_message')) as typeof query;
    }

    const data = await query.orderBy(desc(agentTasks.createdAt)).limit(limit).offset(offset);

    // Count total
    const [total] = await db.select({ count: count() }).from(agentTasks);

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

// GET /tasks/:id - Chi tiết task
tasksApi.get('/:id', async (c) => {
  try {
    const db = getDatabase();
    const taskId = Number(c.req.param('id'));

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId));

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    return c.json({ success: true, data: task });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /tasks - Tạo task mới
tasksApi.post('/', async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();

    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid data', details: parsed.error.issues }, 400);
    }

    const now = new Date();
    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : now;

    const result = await db
      .insert(agentTasks)
      .values({
        type: parsed.data.type,
        targetUserId: parsed.data.targetUserId,
        targetThreadId: parsed.data.targetThreadId,
        payload: JSON.stringify(parsed.data.payload),
        context: parsed.data.context,
        scheduledAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return c.json({ success: true, data: result[0] }, 201);
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /tasks/:id/cancel - Hủy task
tasksApi.post('/:id/cancel', async (c) => {
  try {
    const db = getDatabase();
    const taskId = Number(c.req.param('id'));

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId));

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    if (task.status !== 'pending') {
      return c.json({ success: false, error: 'Can only cancel pending tasks' }, 400);
    }

    await db
      .update(agentTasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(agentTasks.id, taskId));

    return c.json({ success: true, message: 'Task cancelled' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /tasks/:id/retry - Retry failed task
tasksApi.post('/:id/retry', async (c) => {
  try {
    const db = getDatabase();
    const taskId = Number(c.req.param('id'));

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId));

    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    if (task.status !== 'failed') {
      return c.json({ success: false, error: 'Can only retry failed tasks' }, 400);
    }

    await db
      .update(agentTasks)
      .set({
        status: 'pending',
        retryCount: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(agentTasks.id, taskId));

    return c.json({ success: true, message: 'Task queued for retry' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// DELETE /tasks/:id - Xóa task
tasksApi.delete('/:id', async (c) => {
  try {
    const db = getDatabase();
    const taskId = Number(c.req.param('id'));

    await db.delete(agentTasks).where(eq(agentTasks.id, taskId));

    return c.json({ success: true, message: 'Task deleted' });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
