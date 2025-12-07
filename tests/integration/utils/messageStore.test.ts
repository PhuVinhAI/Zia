/**
 * Test: Message Store
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { initDatabase } from '../../../src/infrastructure/database/connection.js';
import {
  saveSentMessage,
  getSentMessage,
  getLastSentMessage,
  removeSentMessage,
  cleanupOldMessages,
} from '../../../src/shared/utils/message/messageStore.js';

// Initialize database before tests
beforeAll(async () => {
  await initDatabase();
});

describe('Message Store', () => {
  const testThreadId = `msgstore-test-${Date.now()}`;

  describe('saveSentMessage()', () => {
    it('should save message and return index', () => {
      const index = saveSentMessage(
        testThreadId,
        'msg-1',
        'cli-1',
        'Hello world'
      );
      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
    });

    it('should increment index for each message', () => {
      const index1 = saveSentMessage(testThreadId, 'msg-2', 'cli-2', 'Message 2');
      const index2 = saveSentMessage(testThreadId, 'msg-3', 'cli-3', 'Message 3');
      expect(index2).toBe(index1 + 1);
    });
  });

  describe('getSentMessage()', () => {
    it('should get message by positive index', () => {
      const msg = getSentMessage(testThreadId, 0);
      expect(msg).not.toBeNull();
      expect(msg?.msgId).toBe('msg-1');
    });

    it('should get message by negative index (-1 = last)', () => {
      const msg = getSentMessage(testThreadId, -1);
      expect(msg).not.toBeNull();
      expect(msg?.msgId).toBe('msg-3');
    });

    it('should return null for out of range index', () => {
      const msg = getSentMessage(testThreadId, 999);
      expect(msg).toBeNull();
    });

    it('should return null for non-existent thread', () => {
      const msg = getSentMessage('non-existent-thread', 0);
      expect(msg).toBeNull();
    });
  });

  describe('getLastSentMessage()', () => {
    it('should get last message', async () => {
      const msg = await getLastSentMessage(testThreadId);
      expect(msg).not.toBeNull();
      expect(msg?.msgId).toBe('msg-3');
    });

    it('should return null for empty thread', async () => {
      const msg = await getLastSentMessage('empty-thread-12345');
      expect(msg).toBeNull();
    });
  });

  describe('removeSentMessage()', () => {
    it('should remove message from cache', () => {
      const threadId = `remove-test-${Date.now()}`;
      saveSentMessage(threadId, 'remove-msg', 'cli-remove', 'To be removed');
      
      const before = getSentMessage(threadId, 0);
      expect(before).not.toBeNull();
      
      removeSentMessage(threadId, 'remove-msg');
      
      const after = getSentMessage(threadId, 0);
      expect(after).toBeNull();
    });
  });

  describe('cleanupOldMessages()', () => {
    it('should run without error', () => {
      cleanupOldMessages();
      // No error means success
      expect(true).toBe(true);
    });
  });
});
