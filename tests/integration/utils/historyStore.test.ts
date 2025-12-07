/**
 * Test: History Store
 * Test các utility functions của history store
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  getHistory,
  getCachedTokenCount,
  getRawHistory,
  isThreadInitialized,
  clearHistory,
  saveResponseToHistory,
  saveToolResultToHistory,
} from '../../../src/shared/utils/history/historyStore.js';

describe('History Store', () => {
  const testThreadId = 'test-thread-' + Date.now();

  describe('getHistory()', () => {
    it('should return empty array for unknown thread', () => {
      const history = getHistory('unknown-thread-xyz');
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('getCachedTokenCount()', () => {
    it('should return 0 for unknown thread', () => {
      const count = getCachedTokenCount('unknown-thread-xyz');
      expect(count).toBe(0);
    });

    it('should return number type', () => {
      const count = getCachedTokenCount(testThreadId);
      expect(typeof count).toBe('number');
    });
  });

  describe('getRawHistory()', () => {
    it('should return empty array for unknown thread', () => {
      const raw = getRawHistory('unknown-thread-xyz');
      expect(Array.isArray(raw)).toBe(true);
      expect(raw.length).toBe(0);
    });
  });

  describe('isThreadInitialized()', () => {
    it('should return false for unknown thread', () => {
      const initialized = isThreadInitialized('unknown-thread-xyz');
      expect(initialized).toBe(false);
    });

    it('should return boolean type', () => {
      const initialized = isThreadInitialized(testThreadId);
      expect(typeof initialized).toBe('boolean');
    });
  });

  describe('clearHistory()', () => {
    it('should not throw for unknown thread', () => {
      expect(() => clearHistory('unknown-thread-xyz')).not.toThrow();
    });

    it('should clear thread state', () => {
      const threadId = 'clear-test-' + Date.now();
      
      // Clear should work even if thread doesn't exist
      clearHistory(threadId);
      
      // After clear, thread should not be initialized
      expect(isThreadInitialized(threadId)).toBe(false);
      expect(getHistory(threadId).length).toBe(0);
      expect(getCachedTokenCount(threadId)).toBe(0);
    });
  });

  describe('saveResponseToHistory()', () => {
    it('should save model response to history', async () => {
      const threadId = 'save-response-test-' + Date.now();
      const responseText = 'Hello, this is a test response!';

      await saveResponseToHistory(threadId, responseText);

      const history = getHistory(threadId);
      expect(history.length).toBeGreaterThan(0);

      const lastMessage = history[history.length - 1];
      expect(lastMessage.role).toBe('model');
      expect(lastMessage.parts[0]).toHaveProperty('text', responseText);

      // Cleanup
      clearHistory(threadId);
    });

    it('should append multiple responses', async () => {
      const threadId = 'multi-response-test-' + Date.now();

      await saveResponseToHistory(threadId, 'Response 1');
      await saveResponseToHistory(threadId, 'Response 2');
      await saveResponseToHistory(threadId, 'Response 3');

      const history = getHistory(threadId);
      expect(history.length).toBe(3);

      // Cleanup
      clearHistory(threadId);
    });
  });

  describe('saveToolResultToHistory()', () => {
    it('should save tool result as user message', async () => {
      const threadId = 'tool-result-test-' + Date.now();
      const toolResult = '[Tool Result] Search completed: 5 results found';

      await saveToolResultToHistory(threadId, toolResult);

      const history = getHistory(threadId);
      expect(history.length).toBeGreaterThan(0);

      const lastMessage = history[history.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.parts[0]).toHaveProperty('text', toolResult);

      // Cleanup
      clearHistory(threadId);
    });

    it('should track tool results in raw history', async () => {
      const threadId = 'tool-raw-test-' + Date.now();
      const toolResult = '[Tool Result] Image generated successfully';

      await saveToolResultToHistory(threadId, toolResult);

      const rawHistory = getRawHistory(threadId);
      expect(rawHistory.length).toBeGreaterThan(0);

      const lastRaw = rawHistory[rawHistory.length - 1];
      expect(lastRaw.isToolResult).toBe(true);
      expect(lastRaw.isSelf).toBe(false);

      // Cleanup
      clearHistory(threadId);
    });
  });

  describe('Mixed history operations', () => {
    it('should maintain correct order of messages', async () => {
      const threadId = 'mixed-history-test-' + Date.now();

      // Simulate conversation flow
      await saveToolResultToHistory(threadId, '[User message simulated as tool result]');
      await saveResponseToHistory(threadId, 'AI response 1');
      await saveToolResultToHistory(threadId, '[Tool: search] Results found');
      await saveResponseToHistory(threadId, 'AI response 2 with tool results');

      const history = getHistory(threadId);
      expect(history.length).toBe(4);

      // Check roles alternate correctly
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('model');
      expect(history[2].role).toBe('user');
      expect(history[3].role).toBe('model');

      // Cleanup
      clearHistory(threadId);
    });

    it('should clear all data after clearHistory', async () => {
      const threadId = 'clear-all-test-' + Date.now();

      await saveResponseToHistory(threadId, 'Test message');
      await saveToolResultToHistory(threadId, 'Tool result');

      // Verify data exists
      expect(getHistory(threadId).length).toBe(2);
      expect(getRawHistory(threadId).length).toBe(2);

      // Clear
      clearHistory(threadId);

      // Verify all cleared
      expect(getHistory(threadId).length).toBe(0);
      expect(getRawHistory(threadId).length).toBe(0);
      expect(getCachedTokenCount(threadId)).toBe(0);
      expect(isThreadInitialized(threadId)).toBe(false);
    });
  });

  // Note: initThreadHistory, saveToHistory, preloadAllHistory cần Zalo API
  // nên không test ở đây. Các functions trên chỉ cần database (async persist).
});
