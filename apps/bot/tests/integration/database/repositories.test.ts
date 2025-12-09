/**
 * Test: Database Repositories
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { initDatabase } from '../../../src/infrastructure/database/connection.js';
import { historyRepository } from '../../../src/infrastructure/database/repositories/history.repository.js';
import { sentMessagesRepository } from '../../../src/infrastructure/database/repositories/sent-messages.repository.js';
import { usersRepository } from '../../../src/infrastructure/database/repositories/users.repository.js';

// Initialize database before tests
beforeAll(async () => {
  await initDatabase();
});

describe('History Repository', () => {
  const testThreadId = `test-thread-${Date.now()}`;

  it('should add message to history', async () => {
    await historyRepository.addMessage(testThreadId, 'user', 'Hello');
    const history = await historyRepository.getHistory(testThreadId);
    expect(history.length).toBeGreaterThan(0);
  });

  it('should get history for thread', async () => {
    const history = await historyRepository.getHistory(testThreadId);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get history for AI format', async () => {
    const history = await historyRepository.getHistoryForAI(testThreadId);
    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      expect(history[0]).toHaveProperty('role');
      expect(history[0]).toHaveProperty('parts');
    }
  });

  it('should count messages', async () => {
    const count = await historyRepository.countMessages(testThreadId);
    expect(typeof count).toBe('number');
  });

  it('should clear history', async () => {
    await historyRepository.addMessage(testThreadId + '-clear', 'user', 'Test');
    const deleted = await historyRepository.clearHistory(testThreadId + '-clear');
    expect(deleted).toBeGreaterThanOrEqual(0);
  });
});

describe('Sent Messages Repository', () => {
  const testThreadId = `test-sent-${Date.now()}`;
  const testMsgId = `msg-${Date.now()}`;

  it('should save message', async () => {
    await sentMessagesRepository.saveMessage({
      msgId: testMsgId,
      cliMsgId: 'cli-123',
      threadId: testThreadId,
      content: 'Test message',
    });
    // No error means success
    expect(true).toBe(true);
  });

  it('should get last message', async () => {
    const msg = await sentMessagesRepository.getLastMessage(testThreadId);
    expect(msg).not.toBeNull();
    expect(msg?.msgId).toBe(testMsgId);
  });

  it('should get by msgId', async () => {
    const msg = await sentMessagesRepository.getByMsgId(testMsgId);
    expect(msg).not.toBeNull();
    expect(msg?.threadId).toBe(testThreadId);
  });

  it('should get recent messages', async () => {
    const messages = await sentMessagesRepository.getRecentMessages(testThreadId, 10);
    expect(Array.isArray(messages)).toBe(true);
  });

  it('should delete message', async () => {
    const deleted = await sentMessagesRepository.deleteMessage(testMsgId);
    expect(deleted).toBe(true);
  });
});

describe('Users Repository', () => {
  const testUserId = `test-user-${Date.now()}`;

  it('should upsert user', async () => {
    const user = await usersRepository.upsertUser(testUserId, {
      name: 'Test User',
      role: 'user',
    });
    expect(user.userId).toBe(testUserId);
    expect(user.name).toBe('Test User');
  });

  it('should get user', async () => {
    const user = await usersRepository.getUser(testUserId);
    expect(user).not.toBeNull();
    expect(user?.userId).toBe(testUserId);
  });

  it('should check admin status', async () => {
    const isAdmin = await usersRepository.isAdmin(testUserId);
    expect(isAdmin).toBe(false);
  });

  it('should check blocked status', async () => {
    const isBlocked = await usersRepository.isBlocked(testUserId);
    expect(isBlocked).toBe(false);
  });

  it('should block user', async () => {
    await usersRepository.blockUser(testUserId);
    const isBlocked = await usersRepository.isBlocked(testUserId);
    expect(isBlocked).toBe(true);
  });

  it('should unblock user', async () => {
    await usersRepository.unblockUser(testUserId);
    const isBlocked = await usersRepository.isBlocked(testUserId);
    expect(isBlocked).toBe(false);
  });

  it('should set admin', async () => {
    await usersRepository.setAdmin(testUserId);
    const isAdmin = await usersRepository.isAdmin(testUserId);
    expect(isAdmin).toBe(true);
  });

  it('should get users by role', async () => {
    const admins = await usersRepository.getUsersByRole('admin');
    expect(Array.isArray(admins)).toBe(true);
  });

  it('should delete user', async () => {
    const deleted = await usersRepository.deleteUser(testUserId);
    expect(deleted).toBe(true);
  });
});
