/**
 * Test: Action Executor
 * Test các execution functions (mock Zalo API)
 */
import { describe, expect, it, mock } from 'bun:test';
import { executeTask } from '../../../src/modules/background-agent/action.executor.js';
import type { AgentTask } from '../../../src/infrastructure/database/schema.js';

// Mock Zalo API
// Note: acceptFriendRequest đã được xử lý tự động trong agent.runner
const createMockApi = () => ({
  sendMessage: mock(() => Promise.resolve({ msgId: 'msg123', cliMsgId: 'cli123' })),
  sendFriendRequest: mock(() => Promise.resolve()),
  findUser: mock(() => Promise.resolve({ uid: 'found-uid-123', display_name: 'Test User' })),
  acceptFriendRequest: mock(() => Promise.resolve()),
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

    // Note: accept_friend đã được xử lý tự động trong agent.runner, không cần task

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

      it('should find user by phone number before sending request', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: '0987654321', // Số điện thoại
          payload: JSON.stringify({ message: 'Chào bạn!' }),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(api.findUser).toHaveBeenCalledWith('0987654321');
        expect(api.sendFriendRequest).toHaveBeenCalled();
        expect(result.data?.uid).toBe('found-uid-123');
      });

      it('should handle phone number starting with 84', async () => {
        const api = createMockApi();
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: '84987654321',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(api.findUser).toHaveBeenCalledWith('84987654321');
      });

      it('should fail if user not found by phone', async () => {
        const api = {
          ...createMockApi(),
          findUser: mock(() => Promise.resolve(null)),
        };
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: '0123456789',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Không tìm thấy user');
      });

      it('should handle error code 225 (already friends)', async () => {
        const error = new Error('Already friends') as any;
        error.code = 225;
        const api = {
          ...createMockApi(),
          sendFriendRequest: mock(() => Promise.reject(error)),
        };
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'existing-friend-uid',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('already_friends');
      });

      it('should handle error code 215 (blocked)', async () => {
        const error = new Error('Blocked') as any;
        error.code = 215;
        const api = {
          ...createMockApi(),
          sendFriendRequest: mock(() => Promise.reject(error)),
        };
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'blocked-user-uid',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(false);
        expect(result.error).toContain('chặn');
      });

      it('should handle error code 222 (they sent request first) and auto-accept', async () => {
        const error = new Error('They sent first') as any;
        error.code = 222;
        const api = {
          ...createMockApi(),
          sendFriendRequest: mock(() => Promise.reject(error)),
        };
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'pending-user-uid',
          payload: JSON.stringify({}),
        });

        const result = await executeTask(api, task);

        expect(result.success).toBe(true);
        expect(result.data?.action).toBe('auto_accepted');
        expect(api.acceptFriendRequest).toHaveBeenCalledWith('pending-user-uid');
      });

      it('should truncate message to 150 characters', async () => {
        const api = createMockApi();
        const longMessage = 'A'.repeat(200);
        const task = createTask({
          type: 'send_friend_request',
          targetUserId: 'user-uid',
          payload: JSON.stringify({ message: longMessage }),
        });

        await executeTask(api, task);

        const calledMessage = (api.sendFriendRequest as any).mock.calls[0][0];
        expect(calledMessage.length).toBe(150);
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
