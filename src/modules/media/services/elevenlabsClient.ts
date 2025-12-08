/**
 * ElevenLabs Client - Text-to-Speech service
 * Voice: Yui | Model: Eleven v3 Alpha
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Singleton client instance
let client: ElevenLabsClient | null = null;

/**
 * Get ElevenLabs client instance
 */
function getElevenLabsClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY không được cấu hình trong .env');
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

/**
 * TTS Options
 */
export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  outputFormat?: string;
}

/** Default voice - Yui */
export const DEFAULT_VOICE_ID = 'fUjY9K2nAIwlALOwSiwc';

/** Default model - Eleven v3 */
export const DEFAULT_MODEL_ID = 'eleven_v3';

/** Output formats */
export const OUTPUT_FORMATS = {
  MP3_44100_128: 'mp3_44100_128',
  MP3_44100_192: 'mp3_44100_192',
} as const;

/**
 * Convert text to speech using Yui voice and Eleven v3 Alpha model
 */
export async function textToSpeech(options: TTSOptions): Promise<Buffer> {
  const elevenlabs = getElevenLabsClient();

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const modelId = options.modelId || DEFAULT_MODEL_ID;

  const audio = await elevenlabs.textToSpeech.convert(voiceId, {
    text: options.text,
    modelId,
    voiceSettings: {
      stability: options.stability ?? 0.5,
      similarityBoost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0.5,
      useSpeakerBoost: options.useSpeakerBoost ?? true,
    },
    outputFormat: (options.outputFormat as any) || OUTPUT_FORMATS.MP3_44100_128,
  });

  // Convert readable stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audio) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
