/**
 * Groq Client - Cấu hình và khởi tạo Groq API cho background agent
 * Hỗ trợ fallback model khi bị rate limit
 */
import { Groq } from 'groq-sdk';
import { CONFIG } from '../../../../core/config/config.js';
import { debugLog } from '../../../../core/logger/logger.js';

debugLog('GROQ', 'Initializing Groq API...');

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model chính và fallback khi bị rate limit
const GROQ_MODELS = {
  primary: 'openai/gpt-oss-120b',
  fallback: 'moonshotai/kimi-k2-instruct-0905',
} as const;

// Track model hiện tại và thời gian cooldown
let currentModel: keyof typeof GROQ_MODELS = 'primary';
let primaryCooldownUntil: number | null = null;
const getRateLimitCooldownMs = () => CONFIG.groq?.rateLimitCooldownMs ?? 60000;

// Model với reasoning capability
export const GROQ_MODEL = GROQ_MODELS.primary;

export const GROQ_CONFIG = {
  temperature: 0.7,
  max_completion_tokens: 65536,
  top_p: 0.95,
  reasoning_effort: 'high' as const,
  stop: null,
};

// Config cho fallback model (không có reasoning_effort)
const GROQ_FALLBACK_CONFIG = {
  temperature: 0.7,
  max_completion_tokens: 16384,
  top_p: 0.95,
  stop: null,
};

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Kiểm tra xem lỗi có phải rate limit không
 */
function isRateLimitError(error: any): boolean {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.message?.includes('rate limit') ||
    error?.message?.includes('Rate limit') ||
    error?.message?.includes('429')
  );
}

/**
 * Lấy model hiện tại (kiểm tra cooldown)
 */
function getCurrentModel(): string {
  // Nếu đang dùng fallback và đã hết cooldown, thử quay lại primary
  if (currentModel === 'fallback' && primaryCooldownUntil && Date.now() > primaryCooldownUntil) {
    debugLog('GROQ', 'Cooldown ended, switching back to primary model');
    currentModel = 'primary';
    primaryCooldownUntil = null;
  }
  return GROQ_MODELS[currentModel];
}

/**
 * Chuyển sang fallback model
 */
function switchToFallback(): void {
  if (currentModel === 'primary') {
    currentModel = 'fallback';
    const cooldownMs = getRateLimitCooldownMs();
    primaryCooldownUntil = Date.now() + cooldownMs;
    console.log(`[Groq] ⚠️ Rate limit! Chuyển sang ${GROQ_MODELS.fallback}, cooldown ${cooldownMs / 1000}s`);
    debugLog('GROQ', `Switched to fallback model: ${GROQ_MODELS.fallback}`);
  }
}

/**
 * Lấy config phù hợp với model hiện tại
 */
function getConfigForModel(model: string, options?: Partial<typeof GROQ_CONFIG>): any {
  const baseConfig = model === GROQ_MODELS.fallback ? GROQ_FALLBACK_CONFIG : GROQ_CONFIG;
  const merged = { ...baseConfig, ...options };
  
  // Fallback model không hỗ trợ reasoning_effort
  if (model === GROQ_MODELS.fallback && 'reasoning_effort' in merged) {
    delete (merged as any).reasoning_effort;
  }
  
  return merged;
}

/**
 * Gọi Groq API để generate response (non-streaming)
 * Tự động fallback sang model khác khi bị rate limit
 */
export async function generateGroqResponse(
  messages: GroqMessage[],
  options?: Partial<typeof GROQ_CONFIG>,
): Promise<string> {
  const model = getCurrentModel();
  const config = getConfigForModel(model, options);
  
  try {
    debugLog('GROQ', `Using model: ${model}`);
    const completion = await groq.chat.completions.create({
      messages,
      model,
      ...config,
      stream: false,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    debugLog('GROQ', `Error with ${model}: ${error?.message || error}`);
    
    // Nếu bị rate limit và đang dùng primary, thử fallback
    if (isRateLimitError(error) && currentModel === 'primary') {
      switchToFallback();
      
      // Retry với fallback model
      const fallbackModel = GROQ_MODELS.fallback;
      const fallbackConfig = getConfigForModel(fallbackModel, options);
      
      debugLog('GROQ', `Retrying with fallback model: ${fallbackModel}`);
      const completion = await groq.chat.completions.create({
        messages,
        model: fallbackModel,
        ...fallbackConfig,
        stream: false,
      });

      return completion.choices[0]?.message?.content || '';
    }
    
    throw error;
  }
}

/**
 * Helper để tạo stream từ Groq API
 */
async function createGroqStream(messages: GroqMessage[], model: string, config: any) {
  return groq.chat.completions.create({
    messages,
    model,
    ...config,
    stream: true,
  } as any);
}

/**
 * Gọi Groq API với streaming
 * Tự động fallback sang model khác khi bị rate limit
 */
export async function* streamGroqResponse(
  messages: GroqMessage[],
  options?: Partial<typeof GROQ_CONFIG>,
): AsyncGenerator<string> {
  const model = getCurrentModel();
  const config = getConfigForModel(model, options);
  
  try {
    debugLog('GROQ', `Streaming with model: ${model}`);
    const stream = await createGroqStream(messages, model, config);

    for await (const chunk of stream as any) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  } catch (error: any) {
    debugLog('GROQ', `Stream error with ${model}: ${error?.message || error}`);
    
    // Nếu bị rate limit và đang dùng primary, thử fallback
    if (isRateLimitError(error) && currentModel === 'primary') {
      switchToFallback();
      
      const fallbackModel = GROQ_MODELS.fallback;
      const fallbackConfig = getConfigForModel(fallbackModel, options);
      
      debugLog('GROQ', `Retrying stream with fallback model: ${fallbackModel}`);
      const stream = await createGroqStream(messages, fallbackModel, fallbackConfig);

      for await (const chunk of stream as any) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      return;
    }
    
    throw error;
  }
}

/**
 * Lấy thông tin model hiện tại (để debug/logging)
 */
export function getGroqModelInfo(): { current: string; primary: string; fallback: string; isFallback: boolean } {
  return {
    current: getCurrentModel(),
    primary: GROQ_MODELS.primary,
    fallback: GROQ_MODELS.fallback,
    isFallback: currentModel === 'fallback',
  };
}
