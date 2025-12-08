/**
 * AI Infrastructure - Exports
 */

// Interface
export type {
  AIMediaPart,
  AIMessage,
  AIResponse,
  AIProviderConfig,
  IAIProvider,
  StreamCallbacks,
} from './ai.interface.js';

export { DEFAULT_AI_RESPONSE } from './ai.interface.js';

// Gemini Provider
export {
  ai,
  extractYouTubeUrls,
  GEMINI_CONFIG,
  getAI,
  getGeminiModel,
  keyManager,
  generateContent,
  generateContentStream,
  deleteChatSession,
  getChatSession,
  parseAIResponse,
  isRateLimitError,
  type MediaPart,
  type MediaType,
} from './providers/gemini/gemini.provider.js';

// Groq Provider
export {
  generateGroqResponse,
  streamGroqResponse,
  GROQ_MODEL,
  type GroqMessage,
} from './providers/groq/groqClient.js';
