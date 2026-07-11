/**
 * Microsoft Edge TTS Client - Text-to-Speech service
 * Sử dụng giọng Neural của Microsoft Edge (miễn phí, không cần API key)
 * Hỗ trợ nhiều ngôn ngữ bao gồm tiếng Việt: vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { CONFIG } from '../../../core/config/config.js';

/** TTS Options */
export interface TTSOptions {
  text: string;
  voice?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
  outputFormat?: string;
}

/** Default voice - Hoài My (nữ, tiếng Việt) */
export const DEFAULT_VOICE = CONFIG.edgeTts?.defaultVoice ?? 'vi-VN-HoaiMyNeural';

/** Default rate */
export const DEFAULT_RATE = CONFIG.edgeTts?.defaultRate ?? '+0%';

/** Default volume */
export const DEFAULT_VOLUME = CONFIG.edgeTts?.defaultVolume ?? '+0%';

/** Default pitch */
export const DEFAULT_PITCH = CONFIG.edgeTts?.defaultPitch ?? '+0Hz';

/** Output format mặc định - MP3 24kHz 96kbps (chất lượng tốt, nhỏ gọn) */
export const OUTPUT_FORMATS = {
  MP3_24KHZ_96KBITRATE: OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
} as const;

/** Danh sách giọng tiếng Việt phổ biến (chỉ dùng nội bộ / test) */
export const VIETNAMESE_VOICES = {
  HOAI_MY: 'vi-VN-HoaiMyNeural', // Nữ miền Bắc
  NAM_MINH: 'vi-VN-NamMinhNeural', // Nam miền Bắc
} as const;

/**
 * Convert text to speech sử dụng Microsoft Edge TTS
 * @returns Buffer chứa dữ liệu âm thanh MP3
 */
export async function textToSpeech(options: TTSOptions): Promise<Buffer> {
  const tts = new MsEdgeTTS();

  const voice = options.voice || DEFAULT_VOICE;
  const outputFormat = (options.outputFormat as any) || OUTPUT_FORMATS.MP3_24KHZ_96KBITRATE;

  // Cấu hình giọng và format
  await tts.setMetadata(voice, outputFormat);

  // Lấy audio stream
  const { audioStream } = tts.toStream(options.text, {
    rate: options.rate || DEFAULT_RATE,
    volume: options.volume || DEFAULT_VOLUME,
    pitch: options.pitch || DEFAULT_PITCH,
  });

  // Convert stream to buffer (Node Readable trả về Buffer cho binary stream)
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk as Buffer);
  }

  if (chunks.length === 0) {
    throw new Error('Microsoft Edge TTS trả về audio rỗng');
  }

  return Buffer.concat(chunks);
}
