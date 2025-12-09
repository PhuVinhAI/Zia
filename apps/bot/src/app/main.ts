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

import { container, logError, logStep, registerLogTransport, Services } from '../core/index.js';
import { startBackgroundAgent } from '../modules/background-agent/index.js';
import { registerMessageListener } from '../modules/gateway/message.listener.js';
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

import { Hono } from 'hono';
import { apiApp, onSettingsChange } from '../infrastructure/api/index.js';
import { reloadSettingsFromData } from '../core/config/config.js';

// API Server với Hono - bao gồm health check và settings API
function startApiServer() {
  const port = Number(process.env.PORT) || 10000;
  const startTime = Date.now();

  const app = new Hono();

  // Health check
  app.get('/', (c) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    return c.json({ status: 'ok', service: 'Zia Bot', uptime: `${uptime}s` });
  });
  app.get('/health', (c) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    return c.json({ status: 'ok', service: 'Zia Bot', uptime: `${uptime}s` });
  });

  // Mount Settings API
  app.route('/api', apiApp);

  // Register settings change listener để auto reload CONFIG
  onSettingsChange((settings) => {
    console.log('[API] 🔄 Settings changed via API, reloading CONFIG...');
    reloadSettingsFromData(settings);
  });

  Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`🌐 API server running on port ${port}`);
  console.log(`   - Health: http://localhost:${port}/health`);
  console.log(`   - Settings API: http://localhost:${port}/api/settings`);
}

async function main() {
  // 0. Start API server (includes health check + settings API)
  startApiServer();

  // 1. Khởi tạo logging
  initLogging();
  printStartupInfo();

  // 2. Đăng nhập Zalo
  const { api } = await loginZalo();

  // Register Zalo API vào container
  container.register(Services.ZALO_API, api);

  // Register Zalo log transport (production: gửi log qua Zalo)
  const { zaloLogTransport } = await import('../infrastructure/messaging/zalo/zaloLogTransport.js');
  const { ThreadType } = await import('../infrastructure/messaging/zalo/zalo.service.js');
  zaloLogTransport.setApi(api, ThreadType);
  registerLogTransport(zaloLogTransport);

  // 3. Khởi tạo và load tất cả modules
  console.log('\n📦 Initializing modules...');
  await initializeApp();

  // 4. Setup listeners và preload history
  await setupListeners(api);

  // 5. Register message listener (logic đã tách vào gateway module)
  registerMessageListener(api, {
    isCloudMessage,
    processCloudMessage,
    shouldSkipMessage,
  });

  // 6. Start background agent
  if (process.env.GROQ_API_KEY) {
    startBackgroundAgent(api);
  } else {
    console.log('⚠️ GROQ_API_KEY not set, background agent disabled');
  }

  // 7. Start sleep mode (auto offline theo giờ)
  const { startSleepMode } = await import('../infrastructure/messaging/zalo/sleepMode.service.js');
  startSleepMode(api);

  console.log('\n👂 Bot đang lắng nghe...');
  logStep('main:listening', 'Bot is now listening for messages');
}

main().catch((err) => {
  logError('main', err);
  console.error('❌ Lỗi khởi động bot:', err);
  process.exit(1);
});
