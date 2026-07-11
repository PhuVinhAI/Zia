/**
 * Integration Test: Microsoft Edge Text-to-Speech
 * Test các chức năng chuyển văn bản thành giọng nói (miễn phí, không cần API key)
 */

import { beforeAll, describe, expect, test } from 'bun:test';
import {
  DEFAULT_PITCH,
  DEFAULT_RATE,
  DEFAULT_VOICE,
  DEFAULT_VOLUME,
  textToSpeech,
  VIETNAMESE_VOICES,
} from '../../../src/modules/media/services/edgeTtsClient.js';
import { TEST_CONFIG } from '../setup.js';

// Cho phép skip qua env var: SKIP_EDGE_TTS=true
const SKIP = process.env.SKIP_EDGE_TTS === 'true';

// Test pure (không cần network) luôn chạy
describe('Microsoft Edge TTS - Defaults', () => {
  test('Default values được export đúng', () => {
    expect(DEFAULT_VOICE).toBeTruthy();
    expect(DEFAULT_RATE).toBeTruthy();
    expect(DEFAULT_VOLUME).toBeTruthy();
    expect(DEFAULT_PITCH).toBeTruthy();
  });
});

describe.skipIf(SKIP)('Microsoft Edge TTS Integration (live API)', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Edge TTS live tests: SKIP_EDGE_TTS=true');
    else console.log('ℹ️  Edge TTS live tests cần kết nối Internet tới Microsoft Edge TTS service');
  });

  test('textToSpeech - chuyển text ngắn thành audio MP3', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Hello, this is a test.',
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);

    // Check MP3 magic bytes (ID3 tag or MPEG frame sync)
    const header = audioBuffer.slice(0, 4).toString('hex');
    const isValidMp3 =
      header.startsWith('4944') || header.startsWith('fff') || header.startsWith('ffe');
    expect(isValidMp3).toBe(true);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với giọng Hoài My tiếng Việt', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Xin chào, đây là bài test tiếng Việt với giọng Hoài My.',
      voice: VIETNAMESE_VOICES.HOAI_MY,
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với giọng Nam Minh tiếng Việt', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Xin chào, tôi là Nam Minh.',
      voice: VIETNAMESE_VOICES.NAM_MINH,
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với custom rate và pitch', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Test tốc độ và cao độ tuỳ chỉnh.',
      voice: DEFAULT_VOICE,
      rate: '-20%',
      pitch: '-5Hz',
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - text dài hơn', async () => {
    const longText = `
      This is a longer text to test the text-to-speech functionality.
      It contains multiple sentences and should produce a longer audio file.
      The Microsoft Edge TTS service should handle this without any issues.
    `.trim();

    const audioBuffer = await textToSpeech({ text: longText });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    // Longer text should produce larger audio
    expect(audioBuffer.length).toBeGreaterThan(5000);
  }, TEST_CONFIG.timeout);
});
