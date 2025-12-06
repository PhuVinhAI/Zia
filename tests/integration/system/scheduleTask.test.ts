/**
 * Integration Test: scheduleTask Tool
 * Test chức năng lên lịch background tasks
 */

import { describe, test, expect, afterAll } from 'bun:test';
import { scheduleTaskTool } from '../../../src/modules/system/tools/scheduleTask.js';
import { getDatabase } from '../../../src/infrastructure/database/connection.js';
import { agentTasks } from '../../../src/infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { TEST_CONFIG, mockToolContext } from '../setup.js';

const db = getDatabase();
const createdTaskIds: number[] = [];

describe('scheduleTask Tool Integration', () => {
  afterAll(async () => {
    // Cleanup test tasks
    for (const id of createdTaskIds) {
      try {
        await db.delete(agentTasks).where(eq(agentTasks.id, id));
      } catch {}
    }
  });

  test('scheduleTask - tạo send_message task', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_message',
        targetThreadId: 'test-thread-123',
        message: 'Hello from test!',
        context: 'Integration test',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.taskId).toBeGreaterThan(0);
    expect(result.data.type).toBe('send_message');
    expect(result.data.message).toContain('Đã lên lịch');

    createdTaskIds.push(result.data.taskId);
  }, TEST_CONFIG.timeout);

  test('scheduleTask - với delay', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_message',
        targetThreadId: 'test-thread-456',
        message: 'Delayed message',
        delayMinutes: 5,
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.message).toContain('sau 5 phút');

    // Verify scheduledAt is in the future
    const scheduledAt = new Date(result.data.scheduledAt);
    const now = new Date();
    expect(scheduledAt.getTime()).toBeGreaterThan(now.getTime());

    createdTaskIds.push(result.data.taskId);
  }, TEST_CONFIG.timeout);

  test('scheduleTask - send_friend_request', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_friend_request',
        targetUserId: 'test-user-789',
        message: 'Hi, let us be friends!',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.type).toBe('send_friend_request');

    createdTaskIds.push(result.data.taskId);
  }, TEST_CONFIG.timeout);

  test('scheduleTask - accept_friend', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'accept_friend',
        targetUserId: 'test-user-accept',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.type).toBe('accept_friend');

    createdTaskIds.push(result.data.taskId);
  }, TEST_CONFIG.timeout);

  test('scheduleTask - validation error (thiếu target)', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_message',
        message: 'No target',
      },
      mockToolContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('targetUserId');
  });

  test('scheduleTask - validation error (send_message thiếu message)', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_message',
        targetThreadId: 'test-thread',
      },
      mockToolContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('tin nhắn');
  });

  test('scheduleTask - verify task in database', async () => {
    const result = await scheduleTaskTool.execute(
      {
        type: 'send_message',
        targetThreadId: 'test-verify-db',
        message: 'Verify in DB',
        context: 'DB verification test',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);

    // Query database to verify
    const [task] = await db
      .select()
      .from(agentTasks)
      .where(eq(agentTasks.id, result.data.taskId))
      .limit(1);

    expect(task).toBeDefined();
    expect(task.type).toBe('send_message');
    expect(task.status).toBe('pending');
    expect(task.targetThreadId).toBe('test-verify-db');

    const payload = JSON.parse(task.payload);
    expect(payload.message).toBe('Verify in DB');

    createdTaskIds.push(result.data.taskId);
  }, TEST_CONFIG.timeout);
});
