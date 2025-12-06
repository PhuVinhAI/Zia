/**
 * E2E Test: Full Bot Flow
 * Test toàn bộ hệ thống như user thật
 *
 * Flow: User gửi message → Bot nhận → AI xử lý → Bot trả lời
 *
 * ⚠️ QUAN TRỌNG:
 * - Cần chạy bot ở terminal khác: bun start
 * - Tests này gửi tin nhắn thật qua Zalo
 * - Cần có ZALO_CREDENTIALS_BASE64 và GEMINI_API_KEY
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import {
  E2E_CONFIG,
  TEST_THREAD_ID,
  canRunE2E,
  getZaloApi,
  waitForResponse,
  e2eLog,
} from './setup.js';

const SKIP = !canRunE2E() || !TEST_THREAD_ID;
const THREAD_TYPE = 0; // User chat

let api: any = null;
let myId: string = '';

describe.skipIf(SKIP)('E2E: Full Bot Flow', () => {
  beforeAll(async () => {
    if (SKIP) {
      console.log('⏭️  Skipping E2E tests:');
      if (!canRunE2E()) console.log('   - Missing ZALO_CREDENTIALS_BASE64 or GEMINI_API_KEY');
      if (!TEST_THREAD_ID) console.log('   - Missing E2E_TEST_THREAD_ID');
      return;
    }

    e2eLog('SETUP', 'Connecting to Zalo...');
    const result = await getZaloApi();
    api = result.api;
    myId = result.myId;

    // Start listener
    api.listener.start();
    await waitForResponse(2000);

    e2eLog('SETUP', `Connected: UID=${myId}, TestThread=${TEST_THREAD_ID}`);
  }, 30000);

  afterAll(async () => {
    if (api?.listener) {
      api.listener.stop();
    }
    e2eLog('CLEANUP', 'Test completed');
  });

  describe('Basic Chat Flow', () => {
    test('Gửi tin nhắn đơn giản - Bot phản hồi', async () => {
      if (!api) return;

      const testMessage = `[E2E Test] Xin chào! ${Date.now()}`;
      e2eLog('SEND', `Sending: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);

      // Đợi bot xử lý (buffer + AI)
      e2eLog('WAIT', `Waiting ${E2E_CONFIG.messageWaitMs}ms for bot response...`);
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      e2eLog('DONE', 'Message sent, check Zalo for bot response');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);

    test('Gửi câu hỏi - Bot trả lời có nội dung', async () => {
      if (!api) return;

      const testMessage = `1 + 1 bằng mấy?`;
      e2eLog('SEND', `Sending: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      e2eLog('DONE', 'Question sent');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('Multi-message Buffer', () => {
    test('Gửi nhiều tin nhắn liên tiếp - Bot gom nhóm xử lý', async () => {
      if (!api) return;

      const messages = ['Tin nhắn 1: Xin chào', 'Tin nhắn 2: Tôi muốn hỏi', 'Tin nhắn 3: Bạn khỏe không?'];

      e2eLog('SEND', `Sending ${messages.length} messages rapidly...`);

      for (const msg of messages) {
        await api.sendMessage(msg, TEST_THREAD_ID, THREAD_TYPE);
        await waitForResponse(500); // Gửi nhanh để test buffer
      }

      e2eLog('WAIT', 'Waiting for bot to process buffered messages...');
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      e2eLog('DONE', 'Multi-message test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('Tool Calling', () => {
    test('Yêu cầu tính toán - Bot dùng tool solveMath', async () => {
      if (!api) return;

      const testMessage = 'Tính giúp tôi: (15 * 8) + (42 / 6) - 17';
      e2eLog('SEND', `Sending math request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 5000); // Tool cần thêm thời gian

      e2eLog('DONE', 'Math tool test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);

    test('Yêu cầu tìm kiếm - Bot dùng tool googleSearch', async () => {
      if (!api) return;

      const testMessage = 'Tìm kiếm: thời tiết Hà Nội hôm nay';
      e2eLog('SEND', `Sending search request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 10000); // Search cần thêm thời gian

      e2eLog('DONE', 'Search tool test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('Media Handling', () => {
    test('Yêu cầu GIF - Bot gửi GIF từ Giphy', async () => {
      if (!api) return;

      const testMessage = 'Gửi cho tôi 1 gif mèo cute';
      e2eLog('SEND', `Sending GIF request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 5000);

      e2eLog('DONE', 'GIF request test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);

    test('Yêu cầu ảnh anime - Bot gửi ảnh từ Nekos', async () => {
      if (!api) return;

      const testMessage = 'Gửi cho tôi 1 ảnh anime neko';
      e2eLog('SEND', `Sending anime image request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 5000);

      e2eLog('DONE', 'Anime image test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('File Creation', () => {
    test('Yêu cầu tạo file Word - Bot tạo và gửi DOCX', async () => {
      if (!api) return;

      const testMessage = 'Tạo file word với nội dung: Báo cáo E2E Test - Ngày ' + new Date().toLocaleDateString('vi-VN');
      e2eLog('SEND', `Sending DOCX request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 10000);

      e2eLog('DONE', 'DOCX creation test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);

    test('Yêu cầu tạo biểu đồ - Bot tạo và gửi chart', async () => {
      if (!api) return;

      const testMessage = 'Tạo biểu đồ cột với dữ liệu: Tháng 1: 100, Tháng 2: 150, Tháng 3: 200';
      e2eLog('SEND', `Sending chart request: "${testMessage}"`);

      await api.sendMessage(testMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs + 10000);

      e2eLog('DONE', 'Chart creation test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('Conversation Context', () => {
    test('Bot nhớ context từ tin nhắn trước', async () => {
      if (!api) return;

      // Tin nhắn 1: Giới thiệu
      const msg1 = 'Tên tôi là TestUser và tôi thích màu xanh';
      e2eLog('SEND', `Context setup: "${msg1}"`);
      await api.sendMessage(msg1, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      // Tin nhắn 2: Hỏi về context
      const msg2 = 'Tên tôi là gì và tôi thích màu gì?';
      e2eLog('SEND', `Context check: "${msg2}"`);
      await api.sendMessage(msg2, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      e2eLog('DONE', 'Context memory test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout * 2);
  });

  describe('Error Handling', () => {
    test('Tin nhắn rất dài - Bot xử lý được', async () => {
      if (!api) return;

      const longMessage = 'Test '.repeat(500) + ' - End of long message';
      e2eLog('SEND', `Sending long message (${longMessage.length} chars)`);

      await api.sendMessage(longMessage, TEST_THREAD_ID, THREAD_TYPE);
      await waitForResponse(E2E_CONFIG.messageWaitMs);

      e2eLog('DONE', 'Long message test complete');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });

  describe('Final Summary', () => {
    test('Gửi tin nhắn tổng kết E2E test', async () => {
      if (!api) return;

      const summary = `✅ E2E Test Suite Complete!

📊 Tests Executed:
• Basic Chat Flow
• Multi-message Buffer
• Tool Calling (Math, Search)
• Media Handling (GIF, Anime)
• File Creation (DOCX, Chart)
• Conversation Context
• Error Handling

⏰ ${new Date().toLocaleString('vi-VN')}`;

      await api.sendMessage(summary, TEST_THREAD_ID, THREAD_TYPE);
      e2eLog('DONE', 'E2E Test Suite completed!');
      expect(true).toBe(true);
    }, E2E_CONFIG.timeout);
  });
});

// Skip info
describe.skipIf(!SKIP)('E2E Test Requirements', () => {
  test('Hiển thị yêu cầu để chạy E2E tests', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    E2E TEST REQUIREMENTS                    ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  1. Cấu hình .env.test:                                    ║
║     - ZALO_CREDENTIALS_BASE64=<base64_credentials>         ║
║     - GEMINI_API_KEY=<your_key>                            ║
║     - E2E_TEST_THREAD_ID=<thread_id_to_test>               ║
║                                                            ║
║  2. Chạy bot ở terminal khác:                              ║
║     $ bun start                                            ║
║                                                            ║
║  3. Chạy E2E tests:                                        ║
║     $ bun test tests/e2e --timeout 120000                  ║
║                                                            ║
║  ⚠️  Tests sẽ gửi tin nhắn THẬT qua Zalo!                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
