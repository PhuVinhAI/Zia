/**
 * Zalo AI Bot - Entry Point
 *
 * Kiến trúc Modular/Plugin-First:
 * 1. Khởi tạo core services
 * 2. Load tất cả modules
 * 3. Start message listener
 *
 * Runtime: Bun (https://bun.sh)
 */

import {
  container,
  debugLog,
  Events,
  eventBus,
  logError,
  logMessage,
  logStep,
  Services,
} from '../core/index.js';
import { addToBuffer } from '../modules/gateway/message.buffer.js';
import { isAllowedUser } from '../modules/gateway/user.filter.js';
import { CONFIG } from '../shared/constants/config.js';
import { initThreadHistory, isThreadInitialized } from '../shared/utils/history.js';
import { abortTask } from '../shared/utils/taskManager.js';
// App setup
import { initializeApp } from './app.module.js';
import {
  initLogging,
  isCloudMessage,
  loginZalo,
  printStartupInfo,
  processCloudMessage,
  setupListeners,
  shouldSkipMessage,
} from './botSetup.js';

async function main() {
  // 1. Khởi tạo logging
  initLogging();
  printStartupInfo();

  // 2. Đăng nhập Zalo
  const { api, myId } = await loginZalo();

  // Register Zalo API vào container
  container.register(Services.ZALO_API, api);

  // 3. Khởi tạo và load tất cả modules
  console.log('\n📦 Initializing modules...');
  await initializeApp();

  // 4. Setup listeners và preload history
  await setupListeners(api);

  // 5. Message handler
  api.listener.on('message', async (message: any) => {
    const threadId = message.threadId;

    // Log RAW message
    if (CONFIG.fileLogging) {
      logMessage('IN', threadId, message);
    }

    // Emit message received event
    await eventBus.emit(Events.MESSAGE_RECEIVED, { threadId, message });

    // Kiểm tra Cloud Debug
    const cloudMessage = isCloudMessage(message);
    if (cloudMessage) {
      processCloudMessage(message);
    }

    // Kiểm tra bỏ qua
    const { skip, reason } = shouldSkipMessage(message);
    if (skip && !cloudMessage) {
      if (reason === 'group message') {
        console.log(`[Bot] 🚫 Bỏ qua tin nhắn nhóm: ${threadId}`);
      }
      debugLog('MSG', `Skipping: ${reason}, thread=${threadId}`);
      return;
    }

    // Kiểm tra user được phép
    const senderId = message.data?.uidFrom || threadId;
    const senderName = message.data?.dName || '';

    if (!cloudMessage && !isAllowedUser(senderId, senderName)) {
      console.log(`[Bot] ⏭️ Bỏ qua: "${senderName}" (${senderId})`);
      return;
    }

    // Khởi tạo history
    const msgType = message.type;
    if (!isThreadInitialized(threadId)) {
      debugLog('MSG', `Initializing history for thread: ${threadId}`);
      await initThreadHistory(api, threadId, msgType);
    }

    // Hủy task đang chạy nếu có
    abortTask(threadId);

    // Thêm vào buffer
    addToBuffer(api, threadId, message);
  });

  console.log('\n👂 Bot đang lắng nghe...');
  logStep('main:listening', 'Bot is now listening for messages');
}

main().catch((err) => {
  logError('main', err);
  console.error('❌ Lỗi khởi động bot:', err);
  process.exit(1);
});
