/**
 * Integration Test: Google Gemini AI
 * Test các chức năng chat và generate với Gemini API
 * Sử dụng model flash để tránh rate limit (2.5 pro chỉ 2 req/min)
 */

import type { Chat } from '@google/genai';
import { describe, test, expect, beforeAll } from 'bun:test';
import {
  getChatSession,
  deleteChatSession,
  buildMessageParts,
} from '../../../src/infrastructure/gemini/geminiChat.js';
import { getAI, getGeminiModel } from '../../../src/infrastructure/gemini/geminiConfig.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('gemini');
const TEST_THREAD_ID = 'test-thread-' + Date.now();

// Sử dụng model flash cho test để tránh rate limit
const TEST_MODEL = 'models/gemini-flash-latest';

// Helper: Tạo chat session với model flash cho test
function createTestChat(history: any[] = []): Chat {
  return getAI().chats.create({
    model: TEST_MODEL,
    config: {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
    history,
  });
}

describe.skipIf(SKIP)('Gemini AI Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Gemini tests: GEMINI_API_KEY not configured');
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
    deleteChatSession(TEST_THREAD_ID);
  });

  test('buildMessageParts - tạo message parts từ text', async () => {
    const parts = await buildMessageParts('Hello, how are you?');

    expect(parts).toBeArray();
    expect(parts.length).toBe(1);
    expect(parts[0]).toHaveProperty('text', 'Hello, how are you?');
  });

  test('Chat với model flash - gửi tin nhắn đơn giản', async () => {
    const chat = createTestChat();

    const response = await chat.sendMessage({
      message: 'Say "Hello Test" and nothing else.',
    });

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
    expect(response.text.toLowerCase()).toContain('hello');
  }, TEST_CONFIG.timeout);

  test('Chat với model flash - conversation context', async () => {
    const chat = createTestChat();

    // First message
    await chat.sendMessage({
      message: 'My name is TestUser. Remember this.',
    });

    // Second message - should remember context
    const response = await chat.sendMessage({
      message: 'What is my name?',
    });

    expect(response.text).toBeDefined();
    expect(response.text.toLowerCase()).toContain('testuser');
  }, TEST_CONFIG.timeout);

  test('Chat với model flash - xử lý câu hỏi phức tạp', async () => {
    const chat = createTestChat();

    const response = await chat.sendMessage({
      message: 'What is 15 * 23? Just give me the number.',
    });

    expect(response.text).toBeDefined();
    expect(response.text).toContain('345');
  }, TEST_CONFIG.timeout);

  test('Direct generate với model flash', async () => {
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: TEST_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Say "OK" only.' }] }],
    });

    expect(response).toBeDefined();
    expect(response.text).toBeDefined();
  }, TEST_CONFIG.timeout);
});
