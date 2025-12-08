/**
 * Integration Test: Groq AI
 * Test các chức năng generate với Groq API
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  groq,
  generateGroqResponse,
  streamGroqResponse,
  GROQ_MODEL,
} from '../../../src/infrastructure/ai/providers/groq/groqClient.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('groq');

describe.skipIf(SKIP)('Groq AI Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Groq tests: GROQ_API_KEY not configured');
  });

  test('groq client - khởi tạo thành công', () => {
    expect(groq).toBeDefined();
  });

  test('GROQ_MODEL - model name hợp lệ', () => {
    expect(GROQ_MODEL).toBeDefined();
    expect(typeof GROQ_MODEL).toBe('string');
  });

  test('generateGroqResponse - generate text đơn giản', async () => {
    const response = await generateGroqResponse([
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: 'Say "Hello Groq" and nothing else.' },
    ]);

    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.toLowerCase()).toContain('hello');
  }, TEST_CONFIG.timeout);

  test('generateGroqResponse - với custom options', async () => {
    const response = await generateGroqResponse(
      [
        { role: 'user', content: 'What is 2 + 2? Answer with just the number.' },
      ],
      { temperature: 0.1 },
    );

    expect(response).toContain('4');
  }, TEST_CONFIG.timeout);

  test('generateGroqResponse - multi-turn conversation', async () => {
    const response = await generateGroqResponse([
      { role: 'system', content: 'You are a math tutor.' },
      { role: 'user', content: 'What is 5 * 5?' },
      { role: 'assistant', content: '5 * 5 = 25' },
      { role: 'user', content: 'Now add 10 to that result.' },
    ]);

    expect(response).toContain('35');
  }, TEST_CONFIG.timeout);

  test('streamGroqResponse - streaming response', async () => {
    const chunks: string[] = [];

    for await (const chunk of streamGroqResponse([
      { role: 'user', content: 'Count from 1 to 5, one number per line.' },
    ])) {
      chunks.push(chunk);
    }

    const fullResponse = chunks.join('');
    expect(fullResponse).toContain('1');
    expect(fullResponse).toContain('5');
    expect(chunks.length).toBeGreaterThan(1); // Should have multiple chunks
  }, TEST_CONFIG.timeout);

  test('generateGroqResponse - xử lý câu hỏi phức tạp', async () => {
    const response = await generateGroqResponse([
      {
        role: 'user',
        content: 'Explain what TypeScript is in one sentence.',
      },
    ]);

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(20);
    expect(response.toLowerCase()).toMatch(/typescript|javascript|type/);
  }, TEST_CONFIG.timeout);
});
