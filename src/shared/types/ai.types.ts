/**
 * AI Types - Interface cho AI service
 * Dùng để dependency injection, tránh shared import infrastructure
 */
import type { Content } from '@google/genai';

export interface TokenCountResult {
  totalTokens?: number;
}

export interface AIService {
  countTokens(params: { model: string; contents: Content[] }): Promise<TokenCountResult>;
}

// Singleton holder - sẽ được set bởi infrastructure layer
let aiService: AIService | null = null;

export function setAIService(service: AIService): void {
  aiService = service;
}

export function getAIService(): AIService {
  if (!aiService) {
    throw new Error('AI Service not initialized. Call setAIService first.');
  }
  return aiService;
}
