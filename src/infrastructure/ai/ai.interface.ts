/**
 * AI Provider Interface
 * Abstract interface cho các AI providers (Gemini, Groq, etc.)
 */

import type { Content } from '@google/genai';

/**
 * Media part cho AI input
 */
export interface AIMediaPart {
  type: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  data: string; // base64
  url?: string;
}

/**
 * AI Response message
 */
export interface AIMessage {
  text: string;
  sticker?: string;
  quoteIndex?: number;
}

/**
 * AI Response format
 */
export interface AIResponse {
  reactions: Array<{ index: number; reaction: string }>;
  messages: AIMessage[];
  undoIndexes: number[];
}

/**
 * Stream callbacks
 */
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  hasResponse: () => boolean;
}

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Abstract AI Provider interface
 */
export interface IAIProvider {
  readonly name: string;

  /**
   * Generate content (non-streaming)
   */
  generateContent(
    prompt: string,
    media?: AIMediaPart[],
    threadId?: string,
    history?: Content[],
  ): Promise<AIResponse>;

  /**
   * Generate content with streaming
   */
  generateContentStream(
    prompt: string,
    callbacks: StreamCallbacks,
    media?: AIMediaPart[],
    threadId?: string,
    history?: Content[],
  ): Promise<AIResponse>;

  /**
   * Clear chat session
   */
  clearSession(threadId: string): void;

  /**
   * Check if provider is available
   */
  isAvailable(): boolean;
}

/**
 * Default empty response
 */
export const DEFAULT_AI_RESPONSE: AIResponse = {
  reactions: [],
  messages: [],
  undoIndexes: [],
};
