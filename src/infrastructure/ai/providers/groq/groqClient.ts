/**
 * Groq Client - Cấu hình và khởi tạo Groq API cho background agent
 */
import { Groq } from 'groq-sdk';
import { debugLog } from '../../../../core/logger/logger.js';

debugLog('GROQ', 'Initializing Groq API...');

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model với reasoning capability
export const GROQ_MODEL = 'openai/gpt-oss-120b';

export const GROQ_CONFIG = {
  temperature: 0.7,
  max_completion_tokens: 65536,
  top_p: 0.95,
  reasoning_effort: 'high' as const,
  stop: null,
};

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Gọi Groq API để generate response (non-streaming)
 */
export async function generateGroqResponse(
  messages: GroqMessage[],
  options?: Partial<typeof GROQ_CONFIG>,
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: GROQ_MODEL,
      ...GROQ_CONFIG,
      ...options,
      stream: false,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    debugLog('GROQ', `Error: ${error}`);
    throw error;
  }
}

/**
 * Gọi Groq API với streaming
 */
export async function* streamGroqResponse(
  messages: GroqMessage[],
  options?: Partial<typeof GROQ_CONFIG>,
): AsyncGenerator<string> {
  const stream = await groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    ...GROQ_CONFIG,
    ...options,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
