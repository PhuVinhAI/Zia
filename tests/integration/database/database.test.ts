/**
 * Integration Test: Database (SQLite + Drizzle)
 * Test các chức năng database operations
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { eq } from 'drizzle-orm';
import { getDatabase, closeDatabase } from '../../../src/infrastructure/database/connection.js';
import { users, agentTasks } from '../../../src/infrastructure/database/schema.js';
import { TEST_CONFIG } from '../setup.js';

const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_THREAD_ID = 'test-thread-' + Date.now();

// Get db instance
const db = getDatabase();

describe('Database Integration', () => {
  beforeAll(async () => {
    // Cleanup any existing test data
    try {
      await db.delete(users).where(eq(users.userId, TEST_USER_ID));
    } catch {
      // Ignore if not exists
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await db.delete(agentTasks).where(eq(agentTasks.createdBy, TEST_USER_ID));
      await db.delete(users).where(eq(users.userId, TEST_USER_ID));
    } catch {
      // Ignore cleanup errors
    }
  });

  test('db connection - kết nối thành công', () => {
    expect(db).toBeDefined();
  });

  test('users - insert user mới', async () => {
    const result = await db
      .insert(users)
      .values({
        userId: TEST_USER_ID,
        name: 'Test User',
        role: 'user',
      })
      .returning();

    expect(result).toBeArray();
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe(TEST_USER_ID);
    expect(result[0].name).toBe('Test User');
  }, TEST_CONFIG.timeout);

  test('users - select user by id', async () => {
    const result = await db.select().from(users).where(eq(users.userId, TEST_USER_ID));

    expect(result).toBeArray();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Test User');
    expect(result[0].role).toBe('user');
  }, TEST_CONFIG.timeout);

  test('users - update user', async () => {
    const result = await db
      .update(users)
      .set({ name: 'Updated Test User' })
      .where(eq(users.userId, TEST_USER_ID))
      .returning();

    expect(result[0].name).toBe('Updated Test User');
  }, TEST_CONFIG.timeout);

  test('agentTasks - insert task', async () => {
    const result = await db
      .insert(agentTasks)
      .values({
        type: 'send_message',
        status: 'pending',
        targetThreadId: TEST_THREAD_ID,
        payload: JSON.stringify({ message: 'Test message' }),
        context: 'Test task context',
        createdBy: TEST_USER_ID,
      })
      .returning();

    expect(result).toBeArray();
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('send_message');
    expect(result[0].status).toBe('pending');
  }, TEST_CONFIG.timeout);

  test('agentTasks - select tasks by creator', async () => {
    const result = await db.select().from(agentTasks).where(eq(agentTasks.createdBy, TEST_USER_ID));

    expect(result).toBeArray();
    expect(result.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('agentTasks - update task status', async () => {
    const existingTasks = await db.select().from(agentTasks).where(eq(agentTasks.createdBy, TEST_USER_ID));

    if (existingTasks.length > 0) {
      const result = await db
        .update(agentTasks)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(agentTasks.id, existingTasks[0].id))
        .returning();

      expect(result[0].status).toBe('completed');
    }
  }, TEST_CONFIG.timeout);

  test('agentTasks - delete task', async () => {
    const existingTasks = await db.select().from(agentTasks).where(eq(agentTasks.createdBy, TEST_USER_ID));

    if (existingTasks.length > 0) {
      await db.delete(agentTasks).where(eq(agentTasks.id, existingTasks[0].id));

      const remaining = await db.select().from(agentTasks).where(eq(agentTasks.id, existingTasks[0].id));
      expect(remaining.length).toBe(0);
    }
  }, TEST_CONFIG.timeout);

  test('users - delete user', async () => {
    await db.delete(users).where(eq(users.userId, TEST_USER_ID));

    const result = await db.select().from(users).where(eq(users.userId, TEST_USER_ID));
    expect(result.length).toBe(0);
  }, TEST_CONFIG.timeout);
});
