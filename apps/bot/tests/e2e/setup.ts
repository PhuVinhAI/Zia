/**
 * E2E Test Setup
 * Cấu hình cho End-to-End tests với Zalo API thật
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.test
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

// E2E Config
export const E2E_CONFIG = {
  timeout: 120000, // 2 phút cho full flow
  messageWaitMs: 15000, // Đợi bot response
  bufferDelayMs: 3000, // Buffer delay của bot
  verbose: process.env.TEST_VERBOSE === 'true',
};

// Thread ID để test (chat với chính mình hoặc bot account khác)
export const TEST_THREAD_ID = process.env.E2E_TEST_THREAD_ID || '';

// Zalo API instance (shared)
let _api: any = null;
let _myId: string = '';

/**
 * Login Zalo và cache API instance
 */
export async function getZaloApi(): Promise<{ api: any; myId: string }> {
  if (_api) return { api: _api, myId: _myId };

  const base64Creds = process.env.ZALO_CREDENTIALS_BASE64;
  if (!base64Creds) {
    throw new Error('ZALO_CREDENTIALS_BASE64 not configured');
  }

  const { Zalo } = await import('../../src/infrastructure/messaging/zalo/zalo.service.js');
  const zaloInstance = new Zalo({
    selfListen: true,
    logging: false,
  });

  const credentials = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf-8'));
  _api = await zaloInstance.login(credentials);
  _myId = _api.getContext().uid;

  return { api: _api, myId: _myId };
}

/**
 * Check if E2E tests can run
 */
export function canRunE2E(): boolean {
  const hasZalo = !!process.env.ZALO_CREDENTIALS_BASE64;
  const hasGemini = !!process.env.GEMINI_API_KEY || !!process.env.GEMINI_API_KEY_1;
  return hasZalo && hasGemini;
}

/**
 * Wait for bot response
 */
export function waitForResponse(ms: number = E2E_CONFIG.messageWaitMs): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a message listener that resolves when bot responds
 */
export function createResponseListener(
  api: any,
  threadId: string,
  myId: string,
  timeoutMs: number = E2E_CONFIG.messageWaitMs,
): Promise<any[]> {
  return new Promise((resolve) => {
    const responses: any[] = [];
    let resolved = false;

    const handler = (msg: any) => {
      // Chỉ lấy tin nhắn từ bot (không phải self)
      if (msg.threadId === threadId && !msg.isSelf) {
        responses.push(msg);
      }
    };

    api.listener.on('message', handler);

    // Timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        api.listener.off('message', handler);
        resolve(responses);
      }
    }, timeoutMs);
  });
}

/**
 * Log helper
 */
export function e2eLog(tag: string, message: string, data?: any): void {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${timestamp}] [E2E:${tag}] ${message}`);
  if (E2E_CONFIG.verbose && data) {
    console.log('   Data:', JSON.stringify(data, null, 2).slice(0, 500));
  }
}
