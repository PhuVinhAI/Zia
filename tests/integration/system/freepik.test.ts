/**
 * Integration Test: Freepik API (Seedream v4 Image Generation)
 * Test các chức năng tạo ảnh AI
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  generateSeedreamImage,
  getSeedreamTaskStatus,
  pollTaskUntilComplete,
} from '../../../src/modules/system/services/freepikClient.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('freepik');

describe.skipIf(SKIP)('Freepik API Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Freepik tests: FREEPIK_API_KEY not configured');
  });

  test('generateSeedreamImage - tạo task', async () => {
    const result = await generateSeedreamImage({
      prompt: 'A cute cat sitting on a desk, digital art style',
    });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.task_id).toBeDefined();
    expect(['CREATED', 'IN_PROGRESS']).toContain(result.data.status);
  }, TEST_CONFIG.timeout);

  test('getSeedreamTaskStatus - kiểm tra trạng thái task', async () => {
    // Tạo task trước
    const createResult = await generateSeedreamImage({
      prompt: 'A simple blue circle',
    });

    const taskId = createResult.data.task_id;
    expect(taskId).toBeDefined();

    // Check status
    const status = await getSeedreamTaskStatus(taskId);
    expect(status.data.task_id).toBe(taskId);
    expect(['CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']).toContain(status.data.status);
  }, TEST_CONFIG.timeout);

  test('pollTaskUntilComplete - đợi task hoàn thành', async () => {
    // First create a simple task without aspect ratio
    const createResult = await generateSeedreamImage({
      prompt: 'A simple red circle on white background',
    });

    const taskId = createResult.data.task_id;

    // Poll với timeout ngắn hơn cho test
    const finalStatus = await pollTaskUntilComplete(taskId, 15, 2000);

    expect(finalStatus.data.task_id).toBe(taskId);

    if (finalStatus.data.status === 'COMPLETED') {
      expect(finalStatus.data.generated).toBeArray();
      expect(finalStatus.data.generated!.length).toBeGreaterThan(0);
    }
  }, 60000); // 60s timeout cho polling

  test('generateSeedreamImage - với prompt dài hơn', async () => {
    const result = await generateSeedreamImage({
      prompt: 'A beautiful landscape with mountains and a lake at sunset, digital art style',
    });

    expect(result.data.task_id).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('generateSeedreamImage - với guidance scale', async () => {
    const result = await generateSeedreamImage({
      prompt: 'Abstract colorful art',
      guidanceScale: 7.5,
    });

    expect(result.data.task_id).toBeDefined();
  }, TEST_CONFIG.timeout);
});
