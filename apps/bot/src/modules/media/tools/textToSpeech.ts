/**
 * Tool: textToSpeech - Chuyển văn bản thành giọng nói với Microsoft Edge TTS
 * Sử dụng giọng Neural miễn phí của Microsoft Edge, hỗ trợ nhiều ngôn ngữ bao gồm tiếng Việt.
 * Trả về file âm thanh MP3 có thể phát trực tiếp.
 */

import type { ITool, ToolResult } from '../../../core/types.js';
import {
  type TextToSpeechParams,
  TextToSpeechSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import {
  DEFAULT_PITCH,
  DEFAULT_RATE,
  DEFAULT_VOICE,
  DEFAULT_VOLUME,
  OUTPUT_FORMATS,
  textToSpeech,
} from '../services/edgeTtsClient.js';

export const textToSpeechTool: ITool = {
  name: 'textToSpeech',
  description: `Chuyển văn bản thành giọng nói (Text-to-Speech) sử dụng Microsoft Edge TTS.
Hỗ trợ nhiều giọng Neural chất lượng cao, bao gồm tiếng Việt (vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural).
Trả về file âm thanh MP3 có thể phát trực tiếp. Miễn phí, không cần API key.`,
  parameters: [
    {
      name: 'text',
      type: 'string',
      description: 'Văn bản cần chuyển thành giọng nói (tối đa 5000 ký tự)',
      required: true,
    },
    {
      name: 'voice',
      type: 'string',
      description:
        'Mã giọng nói (vd: vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural, en-US-AriaNeural). Mặc định: vi-VN-HoaiMyNeural',
      required: false,
    },
    {
      name: 'rate',
      type: 'string',
      description: 'Tốc độ đọc (vd: "+0%", "-10%", "+50%"). Mặc định: +0%',
      required: false,
    },
    {
      name: 'volume',
      type: 'string',
      description: 'Âm lượng (vd: "+0%", "+50%", "-20%"). Mặc định: +0%',
      required: false,
    },
    {
      name: 'pitch',
      type: 'string',
      description: 'Cao độ giọng (vd: "+0Hz", "-10Hz", "+50Hz"). Mặc định: +0Hz',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParamsWithExample(TextToSpeechSchema, params, 'textToSpeech');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data as TextToSpeechParams;

    try {
      // Generate audio với Microsoft Edge TTS
      const audioBuffer = await textToSpeech({
        text: data.text,
        voice: data.voice || DEFAULT_VOICE,
        rate: data.rate || DEFAULT_RATE,
        volume: data.volume || DEFAULT_VOLUME,
        pitch: data.pitch || DEFAULT_PITCH,
        outputFormat: OUTPUT_FORMATS.MP3_24KHZ_96KBITRATE,
      });

      return {
        success: true,
        data: {
          audio: audioBuffer,
          audioBase64: audioBuffer.toString('base64'),
          mimeType: 'audio/mpeg',
          format: 'mp3',
          textLength: data.text.length,
          voice: data.voice || DEFAULT_VOICE,
          settings: {
            rate: data.rate || DEFAULT_RATE,
            volume: data.volume || DEFAULT_VOLUME,
            pitch: data.pitch || DEFAULT_PITCH,
          },
        },
      };
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes('network') || msg.includes('ECONN') || msg.includes('timeout')) {
        return {
          success: false,
          error: 'Lỗi kết nối tới Microsoft Edge TTS. Vui lòng kiểm tra mạng và thử lại.',
        };
      }
      if (msg.includes('voice') || msg.includes('Voice')) {
        return {
          success: false,
          error: `Giọng đọc không hợp lệ. Một số giọng phổ biến: vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural, en-US-AriaNeural.`,
        };
      }
      return { success: false, error: `Lỗi TTS: ${msg}` };
    }
  },
};
