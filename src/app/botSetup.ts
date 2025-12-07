/**
 * Bot Setup - Khởi tạo và cấu hình bot
 */

import {
  debugLog,
  enableFileLogging,
  getSessionDir,
  initFileLogger,
  logStep,
} from '../core/logger/logger.js';
import { loginWithQR, ThreadType } from '../infrastructure/zalo/zalo.service.js';
import { setupSelfMessageListener } from '../modules/gateway/gateway.module.js';
import { CONFIG } from '../shared/constants/config.js';
import { preloadAllHistory } from '../shared/utils/history/history.js';

/**
 * Khởi tạo file logging
 */
export function initLogging() {
  if (CONFIG.fileLogging) {
    initFileLogger(CONFIG.logFile);
    enableFileLogging();
    debugLog(
      'INIT',
      `Config loaded: ${JSON.stringify({
        name: CONFIG.name,
        prefix: CONFIG.prefix,
        requirePrefix: CONFIG.requirePrefix,
        rateLimitMs: CONFIG.rateLimitMs,
        useStreaming: CONFIG.useStreaming,
        selfListen: CONFIG.selfListen,
        allowedUserIds: CONFIG.allowedUserIds,
      })}`,
    );
  }
}

/**
 * In thông tin khởi động
 */
export function printStartupInfo() {
  console.log('─'.repeat(50));
  console.log(`🤖 ${CONFIG.name}`);
  console.log(`📌 Prefix: "${CONFIG.prefix}" (${CONFIG.requirePrefix ? 'bắt buộc' : 'tùy chọn'})`);
  console.log(`⏱️ Rate limit: ${CONFIG.rateLimitMs}ms`);
  console.log(
    `👥 Allowed user IDs: ${
      CONFIG.allowedUserIds.length > 0 ? CONFIG.allowedUserIds.join(', ') : 'Tất cả'
    }`,
  );
  console.log(`📝 Streaming: ${CONFIG.useStreaming ? 'ON' : 'OFF'}`);
  if (CONFIG.fileLogging) {
    console.log(`📄 Session: ${getSessionDir()}`);
  }
  console.log('─'.repeat(50));

  logStep('main:start', { config: CONFIG.name });
}

/**
 * Đăng nhập Zalo
 */
export async function loginZalo() {
  const { api, myId } = await loginWithQR();
  logStep('main:loginComplete', 'Zalo login successful');

  // Log Cloud Debug status
  if (CONFIG.cloudDebug.enabled) {
    console.log(`☁️ Cloud Debug: ON (prefix: "${CONFIG.cloudDebug.prefix}")`);
    debugLog('INIT', `Cloud Debug enabled with prefix: ${CONFIG.cloudDebug.prefix}`);
  }

  return { api, myId };
}

/**
 * Setup listeners và preload history
 */
export async function setupListeners(api: any) {
  // Setup self message listener
  setupSelfMessageListener(api);
  debugLog('INIT', 'Self message listener setup complete');

  // Start listener
  api.listener.start();
  debugLog('INIT', 'Listener starting...');

  // Chờ WebSocket connect
  await new Promise<void>((resolve) => {
    const checkReady = () => {
      setTimeout(resolve, 2000);
    };
    if (api.listener.on) {
      api.listener.once('connected', () => {
        debugLog('INIT', 'WebSocket connected');
        resolve();
      });
      setTimeout(resolve, 2000);
    } else {
      checkReady();
    }
  });
  debugLog('INIT', 'Listener ready');

  // Preload history
  await preloadAllHistory(api);
  debugLog('INIT', 'History preload complete');
}

/**
 * Kiểm tra tin nhắn Cloud Debug
 */
export function isCloudMessage(message: any): boolean {
  if (!CONFIG.cloudDebug.enabled) return false;

  const isSelf = message.isSelf;
  const content = message.data?.content;
  const cloudPrefix = CONFIG.cloudDebug.prefix;

  const hasCloudPrefix = typeof content === 'string' && content.startsWith(cloudPrefix);

  return isSelf && hasCloudPrefix;
}

/**
 * Xử lý tin nhắn Cloud Debug
 */
export function processCloudMessage(message: any): any {
  const content = message.data?.content;
  const cloudPrefix = CONFIG.cloudDebug.prefix;

  debugLog('CLOUD', `Cloud message detected: ${content.substring(0, 50)}...`);
  console.log(`☁️ [Cloud] Nhận lệnh: ${content.substring(0, 50)}...`);

  // Xóa prefix khỏi nội dung
  message.data.content = content.replace(cloudPrefix, '').trim();
  return message;
}

/**
 * Kiểm tra tin nhắn có nên bỏ qua không
 */
export function shouldSkipMessage(message: any): {
  skip: boolean;
  reason?: string;
} {
  const isSelf = message.isSelf;

  // Tin nhắn tự gửi không có prefix Cloud
  if (isSelf && !isCloudMessage(message)) {
    return { skip: true, reason: 'self message without cloud prefix' };
  }

  // [QUAN TRỌNG] Cho phép tin nhắn nhóm đi qua
  // Logic quyết định trả lời hay không sẽ nằm ở Message Processor

  return { skip: false };
}
