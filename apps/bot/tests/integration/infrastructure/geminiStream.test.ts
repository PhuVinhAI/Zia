/**
 * Integration Test: Gemini Stream
 * Test streaming responses từ Gemini API
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { hasApiKey, TEST_CONFIG } from '../setup.js';
import { generateContentStream, type StreamCallbacks } from '../../../src/infrastructure/ai/providers/gemini/geminiStream.js';

const SKIP = !hasApiKey('gemini');

describe.skipIf(SKIP)('Gemini Stream Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Gemini Stream tests: GEMINI_API_KEY not configured');
  });

  test('generateContentStream - streaming text response', async () => {
    const chunks: string[] = [];
    let completed = false;
    let hasError = false;

    const callbacks: StreamCallbacks = {
      onMessage: async (text) => {
        chunks.push(text);
      },
      onComplete: async () => {
        completed = true;
      },
      onError: (error) => {
        hasError = true;
        console.error('Stream error:', error);
      },
    };

    const result = await generateContentStream(
      'Say "Hello World" and nothing else.',
      callbacks,
    );

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(completed).toBe(true);
    expect(hasError).toBe(false);
  }, TEST_CONFIG.timeout);

  test('generateContentStream - với reaction tag', async () => {
    const reactions: string[] = [];
    let completed = false;

    const callbacks: StreamCallbacks = {
      onReaction: async (reaction) => {
        reactions.push(reaction);
      },
      onMessage: async () => {},
      onComplete: async () => {
        completed = true;
      },
    };

    const result = await generateContentStream(
      'Respond with exactly: [reaction:heart] OK',
      callbacks,
    );

    expect(result).toBeDefined();
    expect(completed).toBe(true);
  }, TEST_CONFIG.timeout);

  test('generateContentStream - với sticker tag', async () => {
    const stickers: string[] = [];
    let completed = false;

    const callbacks: StreamCallbacks = {
      onSticker: async (keyword) => {
        stickers.push(keyword);
      },
      onMessage: async () => {},
      onComplete: async () => {
        completed = true;
      },
    };

    const result = await generateContentStream(
      'Respond with exactly: [sticker:happy] Done',
      callbacks,
    );

    expect(result).toBeDefined();
    expect(completed).toBe(true);
  }, TEST_CONFIG.timeout);

  test('generateContentStream - abort signal', async () => {
    const controller = new AbortController();
    let completed = false;

    const callbacks: StreamCallbacks = {
      onMessage: async () => {
        controller.abort();
      },
      onComplete: async () => {
        completed = true;
      },
      signal: controller.signal,
    };

    setTimeout(() => controller.abort(), 100);

    const result = await generateContentStream(
      'Count from 1 to 100 slowly.',
      callbacks,
    );

    expect(typeof result).toBe('string');
  }, TEST_CONFIG.timeout);
});
