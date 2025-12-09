/**
 * Users API - Quản lý người dùng
 */
import { Hono } from 'hono';
import { getDatabase } from '../database/connection.js';
import { users } from '../database/schema.js';
import { eq, desc, count, like, or } from 'drizzle-orm';
import { z } from 'zod';

export const usersApi = new Hono();

// Schema validation
const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['admin', 'user', 'blocked']).optional(),
});

// GET /users - Danh sách users với pagination
usersApi.get('/', async (c) => {
  try {
    const db = getDatabase();
    const page = Number(c.req.query('page')) || 1;
    const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
    const search = c.req.query('search');
    const role = c.req.query('role');
    const offset = (page - 1) * limit;

    let query = db.select().from(users);

    // Filter by search
    if (search) {
      query = query.where(
        or(like(users.userId, `%${search}%`), like(users.name, `%${search}%`)),
      ) as typeof query;
    }

    // Filter by role
    if (role && ['admin', 'user', 'blocked'].includes(role)) {
      query = query.where(eq(users.role, role as 'admin' | 'user' | 'blocked')) as typeof query;
    }

    const data = await query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    // Count total
    const [total] = await db.select({ count: count() }).from(users);

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

// GET /users/:id - Chi tiết user
usersApi.get('/:id', async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param('id');

    const [user] = await db.select().from(users).where(eq(users.userId, userId));

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// PATCH /users/:id - Cập nhật user
usersApi.patch('/:id', async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param('id');
    const body = await c.req.json();

    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid data', details: parsed.error.issues }, 400);
    }

    const [existing] = await db.select().from(users).where(eq(users.userId, userId));
    if (!existing) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    await db.update(users).set(parsed.data).where(eq(users.userId, userId));

    const [updated] = await db.select().from(users).where(eq(users.userId, userId));

    return c.json({ success: true, data: updated });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /users/:id/block - Block user
usersApi.post('/:id/block', async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param('id');

    await db.update(users).set({ role: 'blocked' }).where(eq(users.userId, userId));

    return c.json({ success: true, message: `User ${userId} blocked` });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

// POST /users/:id/unblock - Unblock user
usersApi.post('/:id/unblock', async (c) => {
  try {
    const db = getDatabase();
    const userId = c.req.param('id');

    await db.update(users).set({ role: 'user' }).where(eq(users.userId, userId));

    return c.json({ success: true, message: `User ${userId} unblocked` });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});
