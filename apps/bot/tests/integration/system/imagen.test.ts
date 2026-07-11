/**
 * Integration Test: Google Imagen (native @google/genai SDK)
 * Tạo ảnh AI thông qua ImagenKeyManager (rotate key + model khi rate-limit).
 *
 * Yêu cầu: GEMINI_API_KEY (hoặc GEMINI_API_KEY_1, GEMINI_API_KEY_2...) trong .env.test
 *
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { generateImagenImages, getCurrentImagenModelName } from '../../../src/infrastructure/ai/providers/imagen/imagenClient.js';
import { imagenKeyManager } from '../../../src/infrastructure/ai/providers/imagen/imagenKeyManager.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('gemini');

describe.skipIf(SKIP)('Google Imagen API Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Imagen tests: GEMINI_API_KEY not configured');
  });

  test('imagenKeyManager — should load key + pick default model', () => {
    expect(imagenKeyManager.getTotalKeys()).toBeGreaterThan(0);
    expect(imagenKeyManager.getCurrentModel()).toMatch(/^imagen-4\.0-/);
    expect(imagenKeyManager.getCurrentModelName()).toBeTruthy();
    console.log(`🔑 Loaded ${imagenKeyManager.getTotalKeys()} key(s), current model: ${getCurrentImagenModelName()}`);
  });

  test('generateImagenImages — tạo 1 ảnh 1:1', async () => {
    const result = await generateImagenImages({
      prompt: 'A cute cat sitting on a wooden desk, digital art style',
      aspectRatio: '1:1',
      numberOfImages: 1,
    });

    expect(result.count).toBeGreaterThan(0);
    expect(result.imageBuffers.length).toBe(result.count);
    expect(result.imageBuffers[0].buffer.length).toBeGreaterThan(1000); // ảnh thật phải > 1KB
    expect(result.imageBuffers[0].mimeType).toMatch(/image\/(png|jpeg)/);
    expect(result.model).toMatch(/^imagen-4\.0-/);

    console.log(
      `✅ [${result.model}] Generated ${result.count} image(s), ` +
        `first size: ${result.imageBuffers[0].buffer.length} bytes`,
    );
  }, TEST_CONFIG.timeout);

  test('generateImagenImages — landscape 16:9', async () => {
    const result = await generateImagenImages({
      prompt: 'A beautiful sunset over mountains, cinematic landscape',
      aspectRatio: '16:9',
      numberOfImages: 1,
    });

    expect(result.count).toBe(1);
    expect(result.imageBuffers[0].buffer.length).toBeGreaterThan(1000);
    console.log(`✅ Landscape 16:9 generated (${result.imageBuffers[0].buffer.length} bytes)`);
  }, TEST_CONFIG.timeout);

  test('generateImagenImages — vertical 9:16', async () => {
    const result = await generateImagenImages({
      prompt: 'A tall skyscraper viewed from below, modern architecture',
      aspectRatio: '9:16',
      numberOfImages: 1,
    });

    expect(result.count).toBe(1);
    console.log(`✅ Vertical 9:16 generated`);
  }, TEST_CONFIG.timeout);

  test('generateImagenImages — multiple images (2)', async () => {
    const result = await generateImagenImages({
      prompt: 'An abstract geometric pattern in vibrant colors',
      aspectRatio: '1:1',
      numberOfImages: 2,
    });

    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.count).toBeLessThanOrEqual(2);
    console.log(` ✅ Multi-image call returned ${result.count} image(s)`);
  }, TEST_CONFIG.timeout);

  test('generateImagenImages — person generation dont_allow (negative case)', async () => {
    const result = await generateImagenImages({
      prompt: 'A serene mountain landscape without any people',
      aspectRatio: '4:3',
      personGeneration: 'dont_allow',
    });

    expect(result.count).toBeGreaterThan(0);
    console.log(`✅ Person-restricted call succeeded`);
  }, TEST_CONFIG.timeout);
});
