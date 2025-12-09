/**
 * Integration Test Setup
 * Cấu hình và utilities cho integration tests
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.test explicitly for test environment
const envTestPath = resolve(process.cwd(), '.env.test');
if (existsSync(envTestPath)) {
  const envContent = readFileSync(envTestPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
}

// Test configuration
export const TEST_CONFIG = {
  timeout: 60000, // 60s cho các API calls chậm
  retries: 2,
  verbose: process.env.TEST_VERBOSE === 'true',
};

// API Keys validation
export const API_KEYS = {
  gemini: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_1,
  giphy: process.env.GIPHY_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  googleSearch: process.env.GOOGLE_SEARCH_API_KEY,
  googleSearchCx: process.env.GOOGLE_SEARCH_CX,
  freepik: process.env.FREEPIK_API_KEY,
  e2b: process.env.E2B_API_KEY,
  elevenlabs: process.env.ELEVENLABS_API_KEY,
  groq: process.env.GROQ_API_KEY,
  zaloCredentials: process.env.ZALO_CREDENTIALS_BASE64,
};

/**
 * Check if API key is available
 */
export function hasApiKey(key: keyof typeof API_KEYS): boolean {
  return !!API_KEYS[key];
}

/**
 * Skip test if API key is missing
 */
export function skipIfNoKey(key: keyof typeof API_KEYS): void {
  if (!hasApiKey(key)) {
    console.log(`⏭️  Skipping: ${key} API key not configured`);
  }
}

/**
 * Log test result
 */
export function logResult(testName: string, success: boolean, data?: any): void {
  if (success) {
    console.log(`✅ ${testName}`);
    if (TEST_CONFIG.verbose && data) {
      console.log('   Data:', JSON.stringify(data, null, 2).slice(0, 500));
    }
  } else {
    console.log(`❌ ${testName}`);
    if (data) {
      console.log('   Error:', data);
    }
  }
}

/**
 * Assert helper
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test runner wrapper with timeout
 */
export async function runTest<T>(
  name: string,
  fn: () => Promise<T>,
  timeout = TEST_CONFIG.timeout,
): Promise<{ success: boolean; data?: T; error?: string }> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
  });

  try {
    const data = await Promise.race([fn(), timeoutPromise]);
    logResult(name, true, data);
    return { success: true, data };
  } catch (error: any) {
    logResult(name, false, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Mock ToolContext for testing tools
 */
export const mockToolContext = {
  api: null,
  threadId: 'test-thread-' + Date.now(),
  senderId: 'test-sender-' + Date.now(),
  senderName: 'Test User',
};
