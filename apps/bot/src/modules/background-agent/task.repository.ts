/**
 * Task Repository - CRUD operations cho agent_tasks
 */
import { and, eq, lte, sql } from 'drizzle-orm';
import { getDatabase, notifyDbChange } from '../../infrastructure/database/connection.js';
import {
  type AgentTask,
  agentTasks,
  type TaskStatus,
  type TaskType,
} from '../../infrastructure/database/schema.js';

const db = () => getDatabase();

/**
 * Tạo task mới
 */
export async function createTask(task: {
  type: TaskType;
  targetUserId?: string;
  targetThreadId?: string;
  payload: Record<string, any>;
  context?: string;
  scheduledAt?: Date;
  cronExpression?: string;
  createdBy?: string;
}): Promise<AgentTask> {
  const now = new Date();
  const [created] = await db()
    .insert(agentTasks)
    .values({
      type: task.type,
      targetUserId: task.targetUserId,
      targetThreadId: task.targetThreadId,
      payload: JSON.stringify(task.payload),
      context: task.context,
      scheduledAt: task.scheduledAt || now,
      cronExpression: task.cronExpression,
      createdBy: task.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  notifyDbChange();
  return created;
}

/**
 * Lấy các tasks pending và đã đến giờ execute
 */
export async function getPendingTasks(limit = 10): Promise<AgentTask[]> {
  const now = new Date();
  return db()
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.status, 'pending'), lte(agentTasks.scheduledAt, now)))
    .orderBy(agentTasks.scheduledAt)
    .limit(limit);
}

/**
 * Cập nhật status task
 */
export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus,
  extra?: {
    startedAt?: Date;
    completedAt?: Date;
    lastError?: string;
    result?: string;
    retryCount?: number;
  },
): Promise<void> {
  await db()
    .update(agentTasks)
    .set({
      status,
      updatedAt: new Date(),
      ...extra,
    })
    .where(eq(agentTasks.id, taskId));
  notifyDbChange();
}

/**
 * Đánh dấu task đang xử lý
 */
export async function markTaskProcessing(taskId: number): Promise<void> {
  await updateTaskStatus(taskId, 'processing', { startedAt: new Date() });
}

/**
 * Đánh dấu task hoàn thành
 */
export async function markTaskCompleted(taskId: number, result?: any): Promise<void> {
  await updateTaskStatus(taskId, 'completed', {
    completedAt: new Date(),
    result: result ? JSON.stringify(result) : undefined,
  });
}

/**
 * Đánh dấu task thất bại
 */
export async function markTaskFailed(
  taskId: number,
  error: string,
  currentRetryCount: number,
  maxRetries: number,
): Promise<void> {
  const newStatus: TaskStatus = currentRetryCount + 1 >= maxRetries ? 'failed' : 'pending';
  await updateTaskStatus(taskId, newStatus, {
    lastError: error,
    retryCount: currentRetryCount + 1,
  });
}

/**
 * Hủy task
 */
export async function cancelTask(taskId: number): Promise<void> {
  await updateTaskStatus(taskId, 'cancelled');
}

/**
 * Lấy task theo ID
 */
export async function getTaskById(taskId: number): Promise<AgentTask | undefined> {
  const [task] = await db().select().from(agentTasks).where(eq(agentTasks.id, taskId)).limit(1);
  return task;
}

/**
 * Đếm tasks theo status
 */
export async function countTasksByStatus(): Promise<Record<TaskStatus, number>> {
  const result = await db()
    .select({
      status: agentTasks.status,
      count: sql<number>`count(*)`,
    })
    .from(agentTasks)
    .groupBy(agentTasks.status);

  const counts: Record<TaskStatus, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const row of result) {
    counts[row.status as TaskStatus] = row.count;
  }

  return counts;
}

/**
 * Reschedule task có cron expression
 * Reset status về pending và cập nhật scheduledAt cho lần chạy tiếp theo
 */
export async function rescheduleTask(taskId: number, nextScheduledAt: Date): Promise<void> {
  await db()
    .update(agentTasks)
    .set({
      status: 'pending',
      scheduledAt: nextScheduledAt,
      retryCount: 0,
      lastError: null,
      startedAt: null,
      completedAt: null,
      result: null,
      updatedAt: new Date(),
    })
    .where(eq(agentTasks.id, taskId));
  notifyDbChange();
}
