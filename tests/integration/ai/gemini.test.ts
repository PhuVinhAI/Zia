/**
 * Integration Test: Google Gemini AI
 * Test các chức năng chat và generate với Gemini API
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import {
  getChatSession,
  deleteChatSession,
  buildMessageParts,
} from '../../../src/infrastructure/gemini/geminiChat.js';
import { getAI, getGeminiModel } from '../../../src/infrastructure/gemini/geminiConfig.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('gemini');
const TEST_THREAD_ID = 'test-thread-' + Date.now();

describe.skipIf(SKIP)('Gemini AI Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Gemini tests: GEMINI_API_KEY not configured');
  });

  afterEach(() => {
    // Cleanup test sessions
    deleteChatSession(TEST_THREAD_ID);
  });

  test('getAI - khởi tạo Gemini client', () => {
    const ai = getAI();
    expect(ai).toBeDefined();
  });

  test('getGeminiModel - lấy model name', () => {
    const model = getGeminiModel();
    expect(model).toBeDefined();
    expect(typeof model).toBe('string');
    expect(model).toContain('gemini');
  });

  test('getChatSession - tạo chat session mới', () => {
    const session = getChatSession(TEST_THREAD_ID);
    expect(session).toBeDefined();
  });

  test('buildMessageParts - tạo message parts từ text', async () => {
    const parts = await buildMessageParts('Hello, how are you?');

    expect(parts).toBeArray();
    expect(parts.length).toBe(1);
    expect(parts[0]).toHaveProperty('text', 'Hello, how are you?');
  });

  test('Chat session - gửi tin nhắn đơn giản', async () => {
    const session = getChatSession(TEST_THREAD_ID);

    const response = await session.sendMessage({
      message: 'Say "Hello Test" and nothing else.',
    });

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.text.toLowerCase()).toContain('hello');
  }, TEST_CONFIG.timeout);

  // Note: These tests may fail due to rate limiting on free tier (2 req/min)
  // They are marked as potentially flaky

  test('Chat session - conversation context', async () => {
    try {
      const session = getChatSession(TEST_THREAD_ID + '-ctx');

      // First message
      await session.sendMessage({
        message: 'My name is TestUser. Remember this.',
      });

      // Second message - should remember context
      const response = await session.sendMessage({
        message: 'What is my name?',
      });

      // May use tool or respond directly
      expect(response.text).toBeDefined();
    } catch (error: any) {
      // Skip if rate limited
      if (error.status === 429) {
        console.log('⏭️  Skipped due to rate limit');
        return;
      }
      throw error;
    }
  }, TEST_CONFIG.timeout);

  test('Chat session - xử lý câu hỏi phức tạp', async () => {
    try {
      const session = getChatSession(TEST_THREAD_ID + '-math');

      const response = await session.sendMessage({
        message: 'What is 15 * 23? Just give me the number.',
      });

      expect(response.text).toBeDefined();
    } catch (error: any) {
      if (error.status === 429) {
        console.log('⏭️  Skipped due to rate limit');
        return;
      }
      throw error;
    }
  }, TEST_CONFIG.timeout);

  test('Direct generate - không cần session', async () => {
    try {
      const ai = getAI();
      const model = getGeminiModel();

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Say "OK" only.' }] }],
      });

      expect(response).toBeDefined();
    } catch (error: any) {
      if (error.status === 429) {
        console.log('⏭️  Skipped due to rate limit');
        return;
      }
      throw error;
    }
  }, TEST_CONFIG.timeout);
});
