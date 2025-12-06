/**
 * Integration Test: Memory Store (Vector Search)
 * Test các chức năng lưu trữ và tìm kiếm memory
 *
 * NOTE: Requires GEMINI_API_KEY for embedding generation
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { memoryStore, type Memory } from '../../../src/infrastructure/memory/memoryStore.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('gemini'); // Memory store uses Gemini for embeddings
const TEST_USER_ID = 'memory-test-user-' + Date.now();

describe.skipIf(SKIP)('Memory Store Integration', () => {
  let testMemoryId: number | undefined;

  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Memory tests: GEMINI_API_KEY not configured (needed for embeddings)');
  });

  test('memoryStore.add - thêm memory mới', async () => {
    const memoryId = await memoryStore.add('User likes programming in TypeScript', {
      userId: TEST_USER_ID,
      type: 'preference',
      importance: 7,
    });

    expect(memoryId).toBeDefined();
    expect(typeof memoryId).toBe('number');
    expect(memoryId).toBeGreaterThan(0);

    testMemoryId = memoryId;
  }, TEST_CONFIG.timeout);

  test('memoryStore.add - thêm nhiều memories', async () => {
    const contents = [
      'User works as a software engineer',
      'User prefers dark mode in IDEs',
      'User lives in Vietnam',
    ];

    for (const content of contents) {
      const id = await memoryStore.add(content, {
        userId: TEST_USER_ID,
        type: 'fact',
      });
      expect(id).toBeGreaterThan(0);
    }
  }, 90000); // Longer timeout for multiple embeddings

  test('memoryStore.getRecent - lấy memories gần đây', async () => {
    const memories = await memoryStore.getRecent(10);

    expect(memories).toBeArray();
    expect(memories.length).toBeGreaterThan(0);

    for (const mem of memories) {
      expect(mem.content).toBeDefined();
      expect(mem.type).toBeDefined();
    }
  }, TEST_CONFIG.timeout);

  test('memoryStore.search - tìm kiếm semantic', async () => {
    const results = await memoryStore.search('TypeScript programming language', {
      limit: 5,
      userId: TEST_USER_ID,
    });

    expect(results).toBeArray();
    // Should find the TypeScript memory with relevance score
    if (results.length > 0) {
      expect(results[0].relevance).toBeDefined();
      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].effectiveScore).toBeDefined();
    }
  }, TEST_CONFIG.timeout);

  test('memoryStore.search - với filter type', async () => {
    const results = await memoryStore.search('software developer', {
      limit: 5,
      type: 'fact',
    });

    expect(results).toBeArray();
    for (const r of results) {
      expect(r.type).toBe('fact');
    }
  }, TEST_CONFIG.timeout);

  test('memoryStore.getStats - thống kê', async () => {
    const stats = await memoryStore.getStats();

    expect(stats).toBeDefined();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.byType).toBeDefined();
    expect(typeof stats.avgAccessCount).toBe('number');
  }, TEST_CONFIG.timeout);

  test('memoryStore.delete - xóa memory cụ thể', async () => {
    if (testMemoryId) {
      await memoryStore.delete(testMemoryId);

      // Verify deletion by searching
      const results = await memoryStore.search('TypeScript', {
        userId: TEST_USER_ID,
        limit: 10,
      });
      const found = results.find((m) => m.id === testMemoryId);
      expect(found).toBeUndefined();
    }
  }, TEST_CONFIG.timeout);
});
