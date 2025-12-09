/**
 * Bot Setup - Khởi tạo và cấu hình bot
 */

import { CONFIG } from '../core/config/config.js';
import {
  debugLog,
  enableFileLogging,
  getSessionDir,
  initFileLogger,
  logStep,
  setLoggerConfig,
} from '../core/logger/logger.js';
import { setLogCacheThreshold } from '../core/logger/transports.js';
import { loginWithQR } from '../infrastructure/messaging/zalo/zalo.service.js';
import { setupSelfMessageListener } from '../modules/gateway/gateway.module.js';
import { preloadAllHistory } from '../shared/utils/history/history.js';

/**
 * Khởi tạo file logging
 */
export function initLogging() {
  // Set logger config from settings.json
  if (CONFIG.logger) {
    setLoggerConfig({ maxLinesPerFile: CONFIG.logger.maxLinesPerFile });
    setLogCacheThreshold(CONFIG.logger.logCacheThreshold);
  }

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
  const wsTimeout = CONFIG.websocketConnectTimeoutMs ?? 2000;
  await new Promise<void>((resolve) => {
    const checkReady = () => {
      setTimeout(resolve, wsTimeout);
    };
    if (api.listener.on) {
      api.listener.once('connected', () => {
        debugLog('INIT', 'WebSocket connected');
        resolve();
      });
      setTimeout(resolve, wsTimeout);
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
 * Kiểm tra xem tin nhắn có phải là tin nhắn hệ thống (group events) không
 * Các tin nhắn này cần được lưu vào history để AI hiểu context
 */
function isSystemMessage(message: any): boolean {
  const msgType = message.data?.msgType || '';

  // Các loại tin nhắn hệ thống cần lưu
  const systemTypes = [
    'group.join',
    'group.leave',
    'group.kick',
    'group.block',
    'group.unblock',
    'group.add_admin',
    'group.remove_admin',
    'group.name_change',
    'group.avatar_change',
    'group.pin',
    'group.unpin',
    'group.link_change',
    'group.setting_change',
    'chat.undo',
    'undo',
  ];

  return systemTypes.some((type) => msgType.includes(type)) || msgType.includes('group.');
}

/**
 * Kiểm tra tin nhắn có nên bỏ qua không
 */
export function shouldSkipMessage(message: any): {
  skip: boolean;
  reason?: string;
  saveToHistory?: boolean; // Flag để lưu vào history dù skip
} {
  const isSelf = message.isSelf;
  const msgType = message.data?.msgType || '';

  // Tin nhắn hệ thống (group events) - cho phép đi qua để lưu vào history
  // AI cần biết các sự kiện như thêm/xóa thành viên để hiểu context
  if (isSystemMessage(message)) {
    debugLog('MSG', `System message detected: ${msgType}`);
    return { skip: false }; // Cho phép đi qua để lưu vào history
  }

  // Tin nhắn tự gửi không có prefix Cloud
  if (isSelf && !isCloudMessage(message)) {
    return { skip: true, reason: 'self message without cloud prefix' };
  }

  // [QUAN TRỌNG] Cho phép tin nhắn nhóm đi qua
  // Logic quyết định trả lời hay không sẽ nằm ở Message Processor

  return { skip: false };
}
