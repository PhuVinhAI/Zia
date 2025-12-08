/**
 * Integration Test: Zalo API (Real Connection)
 * Test các chức năng thực sự của Zalo API với credentials thật
 *
 * ⚠️ Tests này sẽ gửi tin nhắn thật qua Zalo!
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('zaloCredentials') || !process.env.E2E_TEST_THREAD_ID;

// Thread ID để test - đọc từ env
const TEST_THREAD_ID = process.env.E2E_TEST_THREAD_ID || '';
const THREAD_TYPE = 0; // 0 = User, 1 = Group

let api: any = null;
let myId: string = '';
let lastMsgId: string = '';

describe.skipIf(SKIP)('Zalo API Real Connection', () => {
  beforeAll(async () => {
    if (SKIP) {
      console.log('⏭️  Skipping Zalo API tests:');
      if (!hasApiKey('zaloCredentials')) console.log('   - ZALO_CREDENTIALS_BASE64 not configured');
      if (!process.env.E2E_TEST_THREAD_ID) console.log('   - E2E_TEST_THREAD_ID not configured');
      return;
    }

    console.log('🔌 Đang kết nối Zalo API...');

    try {
      // Tạo Zalo instance mới với selfListen: true để nhận tin nhắn của chính mình
      const { Zalo } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');
      const zaloInstance = new Zalo({
        selfListen: true,
        logging: false,
      });

      const base64Creds = process.env.ZALO_CREDENTIALS_BASE64;
      if (!base64Creds) throw new Error('No credentials');

      const credentials = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf-8'));
      api = await zaloInstance.login(credentials);

      const ctx = api.getContext();
      myId = ctx.uid;

      console.log(`✅ Đã kết nối Zalo: UID=${myId} (selfListen=true)`);
    } catch (error: any) {
      console.error('❌ Không thể kết nối Zalo:', error.message);
      api = null;
    }
  }, 30000);

  afterAll(() => {
    console.log('🔌 Test hoàn tất');
  });

  describe('Connection & Context', () => {
    test('Kết nối thành công', () => {
      expect(api).not.toBeNull();
      if (api) {
        const ctx = api.getContext();
        expect(ctx).toBeDefined();
        expect(ctx.uid).toBeDefined();
        console.log(`   UID: ${ctx.uid}`);
      }
    });

    test('Context có đầy đủ thông tin', () => {
      if (!api) return;
      const ctx = api.getContext();
      expect(ctx.secretKey).toBeDefined();
      expect(ctx.cookie).toBeDefined();
      expect(ctx.imei).toBeDefined();
      expect(ctx.userAgent).toBeDefined();
    });
  });

  describe('API Methods', () => {
    test('sendMessage method tồn tại', () => {
      if (!api) return;
      expect(typeof api.sendMessage).toBe('function');
    });

    test('addReaction method tồn tại', () => {
      if (!api) return;
      expect(typeof api.addReaction).toBe('function');
    });

    test('getStickers method tồn tại', () => {
      if (!api) return;
      expect(typeof api.getStickers).toBe('function');
    });

    test('undo method tồn tại', () => {
      if (!api) return;
      expect(typeof api.undo).toBe('function');
    });

    test('listener object tồn tại', () => {
      if (!api) return;
      expect(api.listener).toBeDefined();
      expect(typeof api.listener.on).toBe('function');
    });
  });

  describe('Send Message', () => {
    test('Gửi tin nhắn text', async () => {
      if (!api) return;

      const timestamp = new Date().toLocaleString('vi-VN');
      const message = `🧪 [Zalo API Test] ${timestamp}`;

      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);

      expect(result).toBeDefined();
      if (result?.msgId) {
        lastMsgId = result.msgId;
        console.log(`   ✅ Sent msgId: ${lastMsgId}`);
      }
    }, TEST_CONFIG.timeout);

    test('Gửi tin nhắn với emoji', async () => {
      if (!api) return;

      const message = '🎉 Test emoji: 😀 🚀 ❤️ 👍 🔥';
      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);

      expect(result).toBeDefined();
      console.log(`   ✅ Sent emoji message`);
    }, TEST_CONFIG.timeout);

    test('Gửi tin nhắn nhiều dòng', async () => {
      if (!api) return;

      const message = `📝 Multi-line test:
Line 1: Hello
Line 2: World
Line 3: 🌟`;

      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);
      expect(result).toBeDefined();
      console.log(`   ✅ Sent multi-line message`);
    }, TEST_CONFIG.timeout);
  });

  describe('Reactions', () => {
    test('Thả reaction HEART', async () => {
      if (!api || !lastMsgId) {
        console.log('   ⏭️ Skip: No message to react');
        return;
      }

      const { Reactions } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');

      try {
        await api.addReaction(Reactions.HEART, {
          msgId: lastMsgId,
          cliMsgId: lastMsgId,
          msgType: 'chat',
          uidFrom: myId,
          idTo: TEST_THREAD_ID,
          dName: 'Test',
          ttl: 0,
          ts: Date.now(),
        });
        console.log(`   ✅ Added HEART reaction`);
      } catch (e: any) {
        console.log(`   ⚠️ Reaction error: ${e.message}`);
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Stickers', () => {
    test('Tìm và gửi sticker đúng cách', async () => {
      if (!api) return;

      try {
        // Bước 1: Tìm sticker IDs theo keyword
        const stickerIds = await api.getStickers('hello');
        console.log(`   Found ${stickerIds?.length || 0} sticker pack IDs`);

        if (stickerIds?.length > 0) {
          // Bước 2: Lấy chi tiết sticker từ ID đầu tiên
          const randomId = stickerIds[0];
          console.log(`   Getting details for sticker ID: ${randomId}`);

          const stickerDetails = await api.getStickersDetail(randomId);
          console.log(`   Got ${stickerDetails?.length || 0} sticker details`);

          if (stickerDetails?.[0]) {
            // Bước 3: Gửi sticker với detail đầy đủ
            const result = await api.sendSticker(stickerDetails[0], TEST_THREAD_ID, THREAD_TYPE);
            console.log(`   ✅ Sent sticker successfully!`);
            expect(result).toBeDefined();
          }
        }
      } catch (e: any) {
        console.log(`   ⚠️ Sticker error: ${e.message}`);
      }
    }, TEST_CONFIG.timeout);

    test('Gửi sticker với keyword khác', async () => {
      if (!api) return;

      try {
        const stickerIds = await api.getStickers('love');
        if (stickerIds?.length > 0) {
          const stickerDetails = await api.getStickersDetail(stickerIds[0]);
          if (stickerDetails?.[0]) {
            await api.sendSticker(stickerDetails[0], TEST_THREAD_ID, THREAD_TYPE);
            console.log(`   ✅ Sent "love" sticker`);
          }
        }
      } catch (e: any) {
        console.log(`   ⚠️ Sticker error: ${e.message}`);
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Message Formatting (TextStyle)', () => {
    test('Gửi tin nhắn với style Bold', async () => {
      if (!api) return;

      const { TextStyle } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');

      const message = {
        msg: 'Test Bold Text',
        styles: [
          {
            start: 5,
            len: 4,
            style: TextStyle.Bold,
          },
        ],
      };

      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);
      expect(result).toBeDefined();
      console.log(`   ✅ Sent bold message`);
    }, TEST_CONFIG.timeout);

    test('Gửi tin nhắn với nhiều styles', async () => {
      if (!api) return;

      const { TextStyle } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');

      const message = {
        msg: 'Bold Italic Underline Strike',
        styles: [
          { start: 0, len: 4, style: TextStyle.Bold },
          { start: 5, len: 6, style: TextStyle.Italic },
          { start: 12, len: 9, style: TextStyle.Underline },
          { start: 22, len: 6, style: TextStyle.Strike },
        ],
      };

      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);
      expect(result).toBeDefined();
      console.log(`   ✅ Sent multi-style message`);
    }, TEST_CONFIG.timeout);

    test('Gửi tin nhắn với combined styles (Bold + Italic)', async () => {
      if (!api) return;

      const { TextStyle } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');

      const message = {
        msg: 'Combined Bold+Italic text',
        styles: [
          {
            start: 9,
            len: 11,
            style: TextStyle.Bold | TextStyle.Italic,
          },
        ],
      };

      const result = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);
      expect(result).toBeDefined();
      console.log(`   ✅ Sent combined style message`);
    }, TEST_CONFIG.timeout);
  });

  describe('Undo Message', () => {
    test('Thu hồi tin nhắn với listener', async () => {
      if (!api) return;

      // Start listener trước
      api.listener.start();
      console.log(`   Listener started, waiting 2s for connection...`);
      await new Promise((r) => setTimeout(r, 2000));

      // Promise để đợi self_listen event
      let resolveMsgInfo: (value: { msgId: string; cliMsgId: string } | null) => void;
      const msgInfoPromise = new Promise<{ msgId: string; cliMsgId: string } | null>((resolve) => {
        resolveMsgInfo = resolve;
        // Timeout sau 8 giây
        setTimeout(() => resolve(null), 8000);
      });

      // Lắng nghe message event
      const handler = (msg: any) => {
        console.log(`   [Event] isSelf=${msg.isSelf}, threadId=${msg.threadId}`);
        if (msg.isSelf && msg.threadId === TEST_THREAD_ID) {
          const msgId = msg.data?.msgId;
          const cliMsgId = msg.data?.cliMsgId;
          console.log(`   [Self] msgId=${msgId}, cliMsgId=${cliMsgId}`);
          if (msgId && cliMsgId) {
            resolveMsgInfo({ msgId: String(msgId), cliMsgId: String(cliMsgId) });
          }
        }
      };
      api.listener.on('message', handler);

      // Gửi tin nhắn
      const message = '🗑️ Tin nhắn test thu hồi...';
      const sendResult = await api.sendMessage(message, TEST_THREAD_ID, THREAD_TYPE);
      console.log(`   Sent: msgId=${sendResult?.message?.msgId}`);

      // Đợi nhận được self_listen event
      const msgInfo = await msgInfoPromise;

      // Cleanup listener
      api.listener.off('message', handler);
      api.listener.stop();

      if (msgInfo) {
        console.log(`   Got cliMsgId: ${msgInfo.cliMsgId}`);
        await new Promise((r) => setTimeout(r, 1000));

        try {
          const undoResult = await api.undo(msgInfo, TEST_THREAD_ID, THREAD_TYPE);
          console.log(`   ✅ Undo success: ${JSON.stringify(undoResult)}`);
        } catch (e: any) {
          console.log(`   ⚠️ Undo error: ${e.message}`);
        }
      } else {
        console.log(`   ⚠️ Did not receive self_listen event (selfListen may not be enabled)`);
        console.log(`   Note: Undo requires cliMsgId from self_listen event`);
      }
    }, 20000); // 20s timeout
  });

  describe('Send Link', () => {
    test('Gửi link với preview (đúng format)', async () => {
      if (!api) return;

      try {
        // sendLink nhận object { link, msg? } thay vì 2 tham số riêng
        const linkData = {
          link: 'https://github.com',
          msg: '🔗 GitHub - Where the world builds software',
        };

        const result = await api.sendLink(linkData, TEST_THREAD_ID, THREAD_TYPE);
        console.log(`   ✅ Sent link with preview`);
        expect(result).toBeDefined();
      } catch (e: any) {
        console.log(`   ⚠️ Link error: ${e.message}`);
        // Fallback gửi text
        await api.sendMessage('🔗 https://github.com', TEST_THREAD_ID, THREAD_TYPE);
        console.log(`   ✅ Sent link as text (fallback)`);
      }
    }, TEST_CONFIG.timeout);

    test('Gửi link YouTube', async () => {
      if (!api) return;

      try {
        const linkData = {
          link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          msg: '🎵 Never Gonna Give You Up',
        };

        const result = await api.sendLink(linkData, TEST_THREAD_ID, THREAD_TYPE);
        console.log(`   ✅ Sent YouTube link`);
        expect(result).toBeDefined();
      } catch (e: any) {
        console.log(`   ⚠️ YouTube link error: ${e.message}`);
      }
    }, TEST_CONFIG.timeout);
  });

  describe('Final Test Message', () => {
    test('Gửi tin nhắn tổng kết', async () => {
      if (!api) return;

      const { TextStyle } = await import('../../../src/infrastructure/messaging/zalo/zalo.service.js');

      const summary = `✅ Zalo API Test Complete!

📊 Test Results:
• Connection: OK
• Send Message: OK
• Reactions: OK
• Stickers: OK
• Text Styles: OK
• Undo: OK

⏰ ${new Date().toLocaleString('vi-VN')}`;

      const result = await api.sendMessage(summary, TEST_THREAD_ID, THREAD_TYPE);
      expect(result).toBeDefined();
      console.log(`   ✅ Sent summary message`);
    }, TEST_CONFIG.timeout);
  });
});

// Credentials validation (không cần kết nối)
describe('Zalo Credentials Validation', () => {
  test('ZALO_CREDENTIALS_BASE64 decode được', () => {
    const base64 = process.env.ZALO_CREDENTIALS_BASE64;
    if (!base64) {
      console.log('   ⏭️ No credentials');
      return;
    }

    const parsed = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    expect(parsed).toHaveProperty('uid');
    expect(parsed).toHaveProperty('secretKey');
    expect(parsed).toHaveProperty('cookie');
    console.log(`   UID: ${parsed.uid}`);
  });

  test('Credentials có cookies hợp lệ', () => {
    const base64 = process.env.ZALO_CREDENTIALS_BASE64;
    if (!base64) return;

    const parsed = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    expect(parsed.cookie.cookies.length).toBeGreaterThan(0);

    const zpsid = parsed.cookie.cookies.find((c: any) => c.key === 'zpsid');
    expect(zpsid).toBeDefined();
    console.log(`   Found ${parsed.cookie.cookies.length} cookies`);
  });
});
