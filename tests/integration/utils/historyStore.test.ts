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
} from '../../../src/shared/utils/historyStore.js';

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

  // Note: initThreadHistory, saveToHistory, saveResponseToHistory, saveToolResultToHistory
  // cần Zalo API hoặc database nên không test ở đây.
  // Chỉ test các utility functions đọc dữ liệu.
});
