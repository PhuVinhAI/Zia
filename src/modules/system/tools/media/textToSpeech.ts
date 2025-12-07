/**
 * Tool: textToSpeech - Chuyển văn bản thành giọng nói với ElevenLabs
 * Sử dụng voice Yui và model Eleven v3 Alpha
 */

import type { ITool, ToolResult } from '../../../../core/types.js';
import {
  type TextToSpeechParams,
  TextToSpeechSchema,
  validateParamsWithExample,
} from '../../../../shared/schemas/tools.schema.js';
import {
  DEFAULT_MODEL_ID,
  DEFAULT_VOICE_ID,
  OUTPUT_FORMATS,
  textToSpeech,
} from '../../services/elevenlabsClient.js';

export const textToSpeechTool: ITool = {
  name: 'textToSpeech',
  description: `Chuyển văn bản thành giọng nói (Text-to-Speech) sử dụng ElevenLabs AI.
Sử dụng giọng Yui và model Eleven v3 - hỗ trợ 70+ ngôn ngữ bao gồm tiếng Việt.
Trả về file âm thanh MP3 có thể phát trực tiếp.`,
  parameters: [
    {
      name: 'text',
      type: 'string',
      description: 'Văn bản cần chuyển thành giọng nói (tối đa 5000 ký tự)',
      required: true,
    },
    {
      name: 'stability',
      type: 'number',
      description:
        'Độ ổn định giọng (0.0-1.0). Cao = nhất quán hơn, thấp = biểu cảm hơn. Mặc định: 0.5',
      required: false,
    },
    {
      name: 'similarityBoost',
      type: 'number',
      description: 'Độ giống giọng gốc (0.0-1.0). Cao = giống hơn. Mặc định: 0.75',
      required: false,
    },
    {
      name: 'style',
      type: 'number',
      description: 'Mức độ biểu cảm (0.0-1.0). Cao = nhiều cảm xúc hơn. Mặc định: 0.5',
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
      // Generate audio với Yui voice và v3 Alpha model
      const audioBuffer = await textToSpeech({
        text: data.text,
        voiceId: DEFAULT_VOICE_ID,
        modelId: DEFAULT_MODEL_ID,
        stability: data.stability,
        similarityBoost: data.similarityBoost,
        style: data.style,
        useSpeakerBoost: true,
        outputFormat: OUTPUT_FORMATS.MP3_44100_128,
      });

      return {
        success: true,
        data: {
          audio: audioBuffer,
          audioBase64: audioBuffer.toString('base64'),
          mimeType: 'audio/mpeg',
          format: 'mp3',
          textLength: data.text.length,
          voiceId: DEFAULT_VOICE_ID,
          voiceName: 'Yui',
          model: DEFAULT_MODEL_ID,
          settings: {
            stability: data.stability ?? 0.5,
            similarityBoost: data.similarityBoost ?? 0.75,
            style: data.style ?? 0.5,
          },
        },
      };
    } catch (error: any) {
      if (error.message?.includes('API key')) {
        return { success: false, error: 'Lỗi xác thực: API key không hợp lệ hoặc chưa cấu hình' };
      }
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        return { success: false, error: 'Đã hết quota ElevenLabs. Vui lòng thử lại sau.' };
      }
      return { success: false, error: `Lỗi TTS: ${error.message}` };
    }
  },
};
