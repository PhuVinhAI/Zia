/**
 * Integration Test: Task Repository
 * Test các chức năng CRUD cho background agent tasks
 */

import { describe, test, expect, afterAll } from 'bun:test';
import {
  createTask,
  getTaskById,
  getPendingTasks,
  updateTaskStatus,
  markTaskProcessing,
  markTaskCompleted,
  markTaskFailed,
  cancelTask,
  countTasksByStatus,
} from '../../../src/modules/background-agent/task.repository.js';
import { getDatabase } from '../../../src/infrastructure/database/connection.js';
import { agentTasks } from '../../../src/infrastructure/database/schema.js';
import { eq } from 'drizzle-orm';
import { TEST_CONFIG } from '../setup.js';

const db = getDatabase();
const createdTaskIds: number[] = [];

describe('Task Repository Integration', () => {
  afterAll(async () => {
    // Cleanup test tasks
    for (const id of createdTaskIds) {
      try {
        await db.delete(agentTasks).where(eq(agentTasks.id, id));
      } catch {}
    }
  });

  describe('createTask', () => {
    test('createTask - tạo task mới', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-thread-repo',
        payload: { message: 'Test message' },
        context: 'Repository test',
        createdBy: 'test-user',
      });

      expect(task).toBeDefined();
      expect(task.id).toBeGreaterThan(0);
      expect(task.type).toBe('send_message');
      expect(task.status).toBe('pending');
      expect(task.targetThreadId).toBe('test-thread-repo');

      createdTaskIds.push(task.id);
    }, TEST_CONFIG.timeout);

    test('createTask - với scheduledAt', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-scheduled',
        payload: { message: 'Scheduled message' },
        scheduledAt: futureDate,
      });

      expect(task.scheduledAt.getTime()).toBeGreaterThan(Date.now());

      createdTaskIds.push(task.id);
    }, TEST_CONFIG.timeout);

    test('createTask - các loại task khác nhau', async () => {
      // accept_friend được xử lý tự động, không cần task
      const types = ['send_message'] as const;

      for (const type of types) {
        const task = await createTask({
          type,
          targetUserId: `test-user-${type}`,
          payload: {},
        });

        expect(task.type).toBe(type);
        createdTaskIds.push(task.id);
      }
    }, TEST_CONFIG.timeout);
  });

  describe('getTaskById', () => {
    test('getTaskById - lấy task tồn tại', async () => {
      const created = await createTask({
        type: 'send_message',
        targetThreadId: 'test-get-by-id',
        payload: { message: 'Get by ID test' },
      });
      createdTaskIds.push(created.id);

      const task = await getTaskById(created.id);

      expect(task).toBeDefined();
      expect(task!.id).toBe(created.id);
      expect(task!.targetThreadId).toBe('test-get-by-id');
    }, TEST_CONFIG.timeout);

    test('getTaskById - task không tồn tại', async () => {
      const task = await getTaskById(999999);
      expect(task).toBeUndefined();
    }, TEST_CONFIG.timeout);
  });

  describe('getPendingTasks', () => {
    test('getPendingTasks - lấy tasks pending', async () => {
      // Create a pending task with past scheduledAt
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-pending',
        payload: { message: 'Pending test' },
        scheduledAt: new Date(Date.now() - 1000), // 1 second ago
      });
      createdTaskIds.push(task.id);

      const pendingTasks = await getPendingTasks(10);

      expect(pendingTasks).toBeArray();
      // Should include our task
      const found = pendingTasks.find((t) => t.id === task.id);
      expect(found).toBeDefined();
    }, TEST_CONFIG.timeout);

    test('getPendingTasks - không lấy tasks scheduled trong tương lai', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-future',
        payload: { message: 'Future test' },
        scheduledAt: futureDate,
      });
      createdTaskIds.push(task.id);

      const pendingTasks = await getPendingTasks(100);

      // Should NOT include future task
      const found = pendingTasks.find((t) => t.id === task.id);
      expect(found).toBeUndefined();
    }, TEST_CONFIG.timeout);
  });

  describe('updateTaskStatus', () => {
    test('markTaskProcessing - đánh dấu đang xử lý', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-processing',
        payload: {},
      });
      createdTaskIds.push(task.id);

      await markTaskProcessing(task.id);

      const updated = await getTaskById(task.id);
      expect(updated!.status).toBe('processing');
      expect(updated!.startedAt).toBeDefined();
    }, TEST_CONFIG.timeout);

    test('markTaskCompleted - đánh dấu hoàn thành', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-completed',
        payload: {},
      });
      createdTaskIds.push(task.id);

      await markTaskCompleted(task.id, { success: true });

      const updated = await getTaskById(task.id);
      expect(updated!.status).toBe('completed');
      expect(updated!.completedAt).toBeDefined();
      expect(updated!.result).toContain('success');
    }, TEST_CONFIG.timeout);

    test('markTaskFailed - đánh dấu thất bại', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-failed',
        payload: {},
      });
      createdTaskIds.push(task.id);

      await markTaskFailed(task.id, 'Test error', 0, 3);

      const updated = await getTaskById(task.id);
      expect(updated!.status).toBe('pending'); // Still pending because retryCount < maxRetries
      expect(updated!.lastError).toBe('Test error');
      expect(updated!.retryCount).toBe(1);
    }, TEST_CONFIG.timeout);

    test('markTaskFailed - chuyển sang failed khi hết retry', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-max-retry',
        payload: {},
      });
      createdTaskIds.push(task.id);

      await markTaskFailed(task.id, 'Final error', 2, 3); // retryCount + 1 >= maxRetries

      const updated = await getTaskById(task.id);
      expect(updated!.status).toBe('failed');
    }, TEST_CONFIG.timeout);

    test('cancelTask - hủy task', async () => {
      const task = await createTask({
        type: 'send_message',
        targetThreadId: 'test-cancel',
        payload: {},
      });
      createdTaskIds.push(task.id);

      await cancelTask(task.id);

      const updated = await getTaskById(task.id);
      expect(updated!.status).toBe('cancelled');
    }, TEST_CONFIG.timeout);
  });

  describe('countTasksByStatus', () => {
    test('countTasksByStatus - đếm tasks', async () => {
      const counts = await countTasksByStatus();

      expect(counts).toBeDefined();
      expect(typeof counts.pending).toBe('number');
      expect(typeof counts.processing).toBe('number');
      expect(typeof counts.completed).toBe('number');
      expect(typeof counts.failed).toBe('number');
      expect(typeof counts.cancelled).toBe('number');
    }, TEST_CONFIG.timeout);
  });
});
