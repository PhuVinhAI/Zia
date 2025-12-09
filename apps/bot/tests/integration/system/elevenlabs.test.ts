/**
 * Integration Test: ElevenLabs Text-to-Speech
 * Test các chức năng chuyển văn bản thành giọng nói
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  textToSpeech,
  DEFAULT_VOICE_ID,
  DEFAULT_MODEL_ID,
} from '../../../src/modules/system/services/elevenlabsClient.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('elevenlabs');

describe.skipIf(SKIP)('ElevenLabs TTS Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping ElevenLabs tests: ELEVENLABS_API_KEY not configured');
  });

  test('textToSpeech - chuyển text ngắn thành audio', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Hello, this is a test.',
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);

    // Check MP3 magic bytes (ID3 tag or MPEG frame sync)
    const header = audioBuffer.slice(0, 4).toString('hex');
    // ID3 = 494433, MPEG sync = fff* or ffe*
    const isValidMp3 = header.startsWith('4944') || header.startsWith('fff') || header.startsWith('ffe');
    expect(isValidMp3).toBe(true);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với voice settings tùy chỉnh', async () => {
    // ElevenLabs v3 only accepts stability: 0.0, 0.5, or 1.0
    const audioBuffer = await textToSpeech({
      text: 'Testing custom voice settings.',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - text tiếng Việt', async () => {
    const audioBuffer = await textToSpeech({
      text: 'Xin chào, đây là bài test tiếng Việt.',
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - text dài hơn', async () => {
    const longText = `
      This is a longer text to test the text-to-speech functionality.
      It contains multiple sentences and should produce a longer audio file.
      The ElevenLabs API should handle this without any issues.
    `.trim();

    const audioBuffer = await textToSpeech({ text: longText });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    // Longer text should produce larger audio
    expect(audioBuffer.length).toBeGreaterThan(5000);
  }, TEST_CONFIG.timeout);

  test('textToSpeech - với output format mặc định', async () => {
    // Note: mp3_44100_192 requires Creator tier, use default format
    const audioBuffer = await textToSpeech({
      text: 'Testing default output format.',
    });

    expect(audioBuffer).toBeInstanceOf(Buffer);
    expect(audioBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);
});
