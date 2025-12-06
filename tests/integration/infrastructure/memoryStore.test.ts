/**
 * Test: Memory Store
 * Note: This test requires database and Gemini API for embeddings
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { initDatabase } from '../../../src/infrastructure/database/connection.js';

// Initialize database before tests
beforeAll(async () => {
  await initDatabase();
});

describe('Memory Store', () => {
  // Import dynamically to ensure database is initialized first
  let memoryStore: any;

  beforeAll(async () => {
    const module = await import('../../../src/infrastructure/memory/memoryStore.js');
    memoryStore = module.memoryStore;
  });

  describe('getStats()', () => {
    it('should return stats object', async () => {
      const stats = await memoryStore.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('avgAccessCount');
      expect(stats).toHaveProperty('staleCount');
    });

    it('should have numeric values', async () => {
      const stats = await memoryStore.getStats();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.avgAccessCount).toBe('number');
      expect(typeof stats.staleCount).toBe('number');
    });
  });

  describe('getRecent()', () => {
    it('should return array', async () => {
      const recent = await memoryStore.getRecent(10);
      expect(Array.isArray(recent)).toBe(true);
    });

    it('should respect limit', async () => {
      const recent = await memoryStore.getRecent(5);
      expect(recent.length).toBeLessThanOrEqual(5);
    });
  });

  // Note: add() and search() tests require Gemini API for embeddings
  // They are skipped in CI environments without API keys
  describe('add() and search()', () => {
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    it.skipIf(!hasApiKey)('should add memory', async () => {
      const id = await memoryStore.add('Test memory content', {
        type: 'note',
        importance: 5,
      });
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it.skipIf(!hasApiKey)('should search memories', async () => {
      // Add a test memory first
      await memoryStore.add('User likes coffee and programming', {
        type: 'preference',
        importance: 7,
      });

      const results = await memoryStore.search('coffee', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
    });

    it.skipIf(!hasApiKey)('should delete memory', async () => {
      const id = await memoryStore.add('To be deleted', { type: 'note' });
      await memoryStore.delete(id);
      // No error means success
      expect(true).toBe(true);
    });

    it.skipIf(!hasApiKey)('should update importance', async () => {
      const id = await memoryStore.add('Important memory', {
        type: 'note',
        importance: 5,
      });
      await memoryStore.updateImportance(id, 10);
      // No error means success
      expect(true).toBe(true);
    });
  });
});
