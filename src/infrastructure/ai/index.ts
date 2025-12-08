/**
 * AI Infrastructure - Exports
 */

// Interface
export type {
  AIMediaPart,
  AIMessage,
  AIProviderConfig,
  AIResponse,
  IAIProvider,
  StreamCallbacks,
} from './ai.interface.js';

export { DEFAULT_AI_RESPONSE } from './ai.interface.js';

// Gemini Provider
export {
  ai,
  deleteChatSession,
  extractYouTubeUrls,
  GEMINI_CONFIG,
  generateContent,
  generateContentStream,
  getAI,
  getChatSession,
  getGeminiModel,
  isRateLimitError,
  keyManager,
  type MediaPart,
  type MediaType,
  parseAIResponse,
} from './providers/gemini/gemini.provider.js';

// Groq Provider
export {
  GROQ_MODEL,
  type GroqMessage,
  generateGroqResponse,
  streamGroqResponse,
} from './providers/groq/groqClient.js';
