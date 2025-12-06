/**
 * Integration Test: textToSpeech Tool
 * Test chức năng chuyển văn bản thành giọng nói
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { textToSpeechTool } from '../../../src/modules/system/tools/textToSpeech.js';
import { hasApiKey, TEST_CONFIG, mockToolContext } from '../setup.js';

const SKIP = !hasApiKey('elevenlabs');

describe.skipIf(SKIP)('textToSpeech Tool Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping textToSpeech tests: ELEVENLABS_API_KEY not configured');
  });

  test('textToSpeech - text ngắn', async () => {
    const result = await textToSpeechTool.execute({
      text: 'Hello, this is a test.',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.audio).toBeInstanceOf(Buffer);
    expect(result.data.mimeType).toBe('audio/mpeg');
    expect(result.data.format).toBe('mp3');
    expect(result.data.voiceName).toBe('Yui');
  }, TEST_CONFIG.timeout);

  test('textToSpeech - text tiếng Việt', async () => {
    const result = await textToSpeechTool.execute({
      text: 'Xin chào, đây là bài test tiếng Việt.',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.audio.length).toBeGreaterThan(1000);
    expect(result.data.audioBase64).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với voice settings', async () => {
    const result = await textToSpeechTool.execute({
      text: 'Testing custom voice settings.',
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.3,
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.settings.stability).toBe(0.5);
    expect(result.data.settings.similarityBoost).toBe(0.8);
    expect(result.data.settings.style).toBe(0.3);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - text dài', async () => {
    const longText = 'This is a longer text that should produce a larger audio file. '.repeat(5);

    const result = await textToSpeechTool.execute({
      text: longText,
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.textLength).toBe(longText.length);
    expect(result.data.audio.length).toBeGreaterThan(5000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - validation error (thiếu text)', async () => {
    const result = await textToSpeechTool.execute({}, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('textToSpeech - validation error (text rỗng)', async () => {
    const result = await textToSpeechTool.execute({
      text: '',
    }, mockToolContext);

    expect(result.success).toBe(false);
  });
});
