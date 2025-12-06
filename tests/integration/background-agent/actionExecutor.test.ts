/**
 * Test: Action Executor
 * Test các execution functions (mock Zalo API)
 */
import { describe, expect, it, mock } from 'bun:test';
import { executeTask } from '../../../src/modules/background-agent/action.executor.js';
import type { AgentTask } from '../../../src/infrastructure/database/schema.js';

// Mock Zalo API
const createMockApi = () => ({
  sendMessage: mock(() => Promise.resolve({ msgId: 'msg123', cliMsgId: 'cli123' })),
  acceptFriendRequest: mock(() => Promise.resolve()),
  sendFriendRequest: mock(() => Promise.resolve()),
});

// Helper to create task
const createTask = (overrides: Partial<AgentTask> = {}): AgentTask => ({
  id: 1,
  type: 'send_message',
  targetUserId: 'user123',
  targetThreadId: 'thread123',
  payload: JSON.stringify({ message: 'Hello' }),
  status: 'pending',
  scheduledAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  retryCount: 0,
  maxRetries: 3,
  context: null,
  result: null,
  lastError: null,
  startedAt: null,
  completedAt: null,
  createdBy: null,
  ...overrides,
});

describe('Action Executor', () => {
  describe('executeTask()', () => {
    describe('send_message', () => {
      it('should send message successfully', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_message',
          payload: JSON.stringify({ message: 'Hello World' }),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('msgId');
        expect(api.sendMessage).toHaveBeenCalled();
      });

      it('should fail without threadId', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_message',
          targetUserId: null,
          targetThreadId: null,
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing');
      });

      it('should fail without message content', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_message',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing message');
      });
    });

    describe('accept_friend', () => {
      it('should accept friend request successfully', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'accept_friend',
          targetUserId: 'friend123',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('accepted');
        expect(api.acceptFriendRequest).toHaveBeenCalled();
      });

      it('should fail without targetUserId', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'accept_friend',
          targetUserId: null,
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing targetUserId');
      });
    });

    describe('send_friend_request', () => {
      it('should send friend request successfully', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'newuser123',
          payload: JSON.stringify({ message: 'Hi, let\'s be friends!' }),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('sent');
        expect(api.sendFriendRequest).toHaveBeenCalled();
      });

      it('should use default message if not provided', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'newuser123',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(api.sendFriendRequest).toHaveBeenCalled();
      });

      it('should fail without targetUserId', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: null,
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing targetUserId');
      });
    });

    describe('unknown task type', () => {
      it('should return error for unknown task type', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'unknown_type' as any,
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown task type');
      });
    });

    describe('error handling', () => {
      it('should handle API errors gracefully', async () => {
        const api = {
          sendMessage: mock(() => Promise.reject(new Error('Network error'))),
          acceptFriendRequest: mock(() => Promise.resolve()),
          sendFriendRequest: mock(() => Promise.resolve()),
        };
        const task = createTask({
          type: 'send_message',
          payload: JSON.stringify({ message: 'Test' }),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });
    });
  });
});
