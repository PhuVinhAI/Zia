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

// Model chính và fallback khi bị rate limit - lấy từ config
const getGroqModels = () => ({
  primary: CONFIG.groqModels?.primary ?? 'openai/gpt-oss-120b',
  fallback: CONFIG.groqModels?.fallback ?? 'moonshotai/kimi-k2-instruct-0905',
});

// Track model hiện tại và thời gian cooldown
let currentModel: 'primary' | 'fallback' = 'primary';
let primaryCooldownUntil: number | null = null;
const getRateLimitCooldownMs = () => CONFIG.groq?.rateLimitCooldownMs ?? 60000;

// Model với reasoning capability - lấy từ config
export const GROQ_MODEL = CONFIG.groqModels?.primary ?? 'openai/gpt-oss-120b';

// Config cho primary model - lấy từ settings.json
const getGroqConfig = () => ({
  temperature: CONFIG.groqModels?.temperature ?? 0.7,
  max_completion_tokens: CONFIG.groqModels?.primaryMaxTokens ?? 65536,
  top_p: CONFIG.groqModels?.topP ?? 0.95,
  reasoning_effort: 'high' as const,
  stop: null,
});

// Config cho fallback model (không có reasoning_effort)
const getGroqFallbackConfig = () => ({
  temperature: CONFIG.groqModels?.temperature ?? 0.7,
  max_completion_tokens: CONFIG.groqModels?.fallbackMaxTokens ?? 16384,
  top_p: CONFIG.groqModels?.topP ?? 0.95,
  stop: null,
});

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
  const models = getGroqModels();
  // Nếu đang dùng fallback và đã hết cooldown, thử quay lại primary
  if (currentModel === 'fallback' && primaryCooldownUntil && Date.now() > primaryCooldownUntil) {
    debugLog('GROQ', 'Cooldown ended, switching back to primary model');
    currentModel = 'primary';
    primaryCooldownUntil = null;
  }
  return models[currentModel];
}

/**
 * Chuyển sang fallback model
 */
function switchToFallback(): void {
  const models = getGroqModels();
  if (currentModel === 'primary') {
    currentModel = 'fallback';
    const cooldownMs = getRateLimitCooldownMs();
    primaryCooldownUntil = Date.now() + cooldownMs;
    console.log(
      `[Groq] ⚠️ Rate limit! Chuyển sang ${models.fallback}, cooldown ${cooldownMs / 1000}s`,
    );
    debugLog('GROQ', `Switched to fallback model: ${models.fallback}`);
  }
}

/**
 * Lấy config phù hợp với model hiện tại
 */
function getConfigForModel(
  model: string,
  options?: Partial<ReturnType<typeof getGroqConfig>>,
): any {
  const models = getGroqModels();
  const baseConfig = model === models.fallback ? getGroqFallbackConfig() : getGroqConfig();
  const merged = { ...baseConfig, ...options };

  // Fallback model không hỗ trợ reasoning_effort
  if (model === models.fallback && 'reasoning_effort' in merged) {
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
  options?: Partial<ReturnType<typeof getGroqConfig>>,
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
      const models = getGroqModels();
      const fallbackModel = models.fallback;
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
  options?: Partial<ReturnType<typeof getGroqConfig>>,
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

      const models = getGroqModels();
      const fallbackModel = models.fallback;
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
export function getGroqModelInfo(): {
  current: string;
  primary: string;
  fallback: string;
  isFallback: boolean;
} {
  const models = getGroqModels();
  return {
    current: getCurrentModel(),
    primary: models.primary,
    fallback: models.fallback,
    isFallback: currentModel === 'fallback',
  };
}
