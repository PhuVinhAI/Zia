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
