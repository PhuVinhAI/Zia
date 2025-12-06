/**
 * Integration Test: Memory Tools (saveMemory, recallMemory)
 * Test chức năng lưu và tìm kiếm long-term memory
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { saveMemoryTool, recallMemoryTool } from '../../../src/modules/system/tools/memory.js';
import { memoryStore } from '../../../src/infrastructure/memory/memoryStore.js';
import { hasApiKey, TEST_CONFIG, mockToolContext } from '../setup.js';

// Memory tools cần Gemini API cho embeddings
const SKIP = !hasApiKey('gemini');

describe.skipIf(SKIP)('Memory Tools Integration', () => {
  const testMemoryIds: number[] = [];

  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Memory tools tests: GEMINI_API_KEY not configured');
  });

  afterAll(async () => {
    // Cleanup test memories
    for (const id of testMemoryIds) {
      try {
        await memoryStore.delete(id);
      } catch {}
    }
  });

  describe('saveMemory', () => {
    test('saveMemory - lưu memory đơn giản', async () => {
      const result = await saveMemoryTool.execute(
        {
          content: 'Test user likes TypeScript programming',
          type: 'preference',
          importance: 7,
        },
        mockToolContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeGreaterThan(0);
      expect(result.data.message).toContain('Đã lưu');

      testMemoryIds.push(result.data.id);
    }, TEST_CONFIG.timeout);

    test('saveMemory - với type khác nhau', async () => {
      const types = ['person', 'fact', 'task', 'note'];

      for (const type of types) {
        const result = await saveMemoryTool.execute(
          {
            content: `Test memory with type ${type}`,
            type,
          },
          mockToolContext,
        );

        expect(result.success).toBe(true);
        testMemoryIds.push(result.data.id);
      }
    }, 90000);

    test('saveMemory - validation error (thiếu content)', async () => {
      const result = await saveMemoryTool.execute(
        {
          type: 'fact',
        },
        mockToolContext,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('recallMemory', () => {
    test('recallMemory - tìm kiếm semantic', async () => {
      // Đợi một chút để embedding được index
      await new Promise((r) => setTimeout(r, 1000));

      const result = await recallMemoryTool.execute(
        {
          query: 'TypeScript programming language',
          limit: 5,
        },
        mockToolContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data.found) {
        expect(result.data.memories).toBeArray();
        expect(result.data.memories.length).toBeGreaterThan(0);
        expect(result.data.memories[0].relevance).toBeDefined();
      }
    }, TEST_CONFIG.timeout);

    test('recallMemory - với filter type', async () => {
      const result = await recallMemoryTool.execute(
        {
          query: 'test memory',
          type: 'preference',
          limit: 3,
        },
        mockToolContext,
      );

      expect(result.success).toBe(true);

      if (result.data.found) {
        for (const mem of result.data.memories) {
          expect(mem.type).toBe('preference');
        }
      }
    }, TEST_CONFIG.timeout);

    test('recallMemory - không tìm thấy hoặc empty', async () => {
      const result = await recallMemoryTool.execute(
        {
          query: 'xyzabc123nonexistent',
          limit: 5,
        },
        mockToolContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // May or may not find results depending on existing data
      expect(result.data.memories).toBeArray();
    }, TEST_CONFIG.timeout);

    test('recallMemory - validation error (thiếu query)', async () => {
      const result = await recallMemoryTool.execute(
        {
          limit: 5,
        },
        mockToolContext,
      );

      expect(result.success).toBe(false);
    });
  });
});


// ═══════════════════════════════════════════════════
// Memory Store Service Tests (từ database/memory.test.ts đã merge)
// ═══════════════════════════════════════════════════

const TEST_USER_ID = 'memory-test-user-' + Date.now();

describe.skipIf(SKIP)('Memory Store Service', () => {
  let testMemoryId: number | undefined;

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
  }, 90000);

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

      const results = await memoryStore.search('TypeScript', {
        userId: TEST_USER_ID,
        limit: 10,
      });
      const found = results.find((m) => m.id === testMemoryId);
      expect(found).toBeUndefined();
    }
  }, TEST_CONFIG.timeout);
});
