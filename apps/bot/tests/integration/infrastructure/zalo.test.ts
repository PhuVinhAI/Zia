/**
 * Integration Test: Zalo Service
 * Test các chức năng của Zalo API wrapper
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

// Import Zalo service components
import {
  Zalo,
  ThreadType,
  Reactions,
  TextStyle,
} from '../../../src/infrastructure/messaging/zalo/zalo.service.js';

const SKIP = !hasApiKey('zaloCredentials');

describe.skipIf(SKIP)('Zalo Service Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Zalo tests: ZALO_CREDENTIALS_BASE64 not configured');
  });

  describe('Zalo Exports', () => {
    test('Zalo class được export', () => {
      expect(Zalo).toBeDefined();
      expect(typeof Zalo).toBe('function');
    });

    test('ThreadType enum được export', () => {
      expect(ThreadType).toBeDefined();
      expect(ThreadType.User).toBeDefined();
    });

    test('Reactions enum được export', () => {
      expect(Reactions).toBeDefined();
      expect(Reactions.HEART).toBeDefined();
      expect(Reactions.HAHA).toBeDefined();
      expect(Reactions.WOW).toBeDefined();
      expect(Reactions.SAD).toBeDefined();
      expect(Reactions.ANGRY).toBeDefined();
      expect(Reactions.LIKE).toBeDefined();
    });

    test('TextStyle enum được export', () => {
      expect(TextStyle).toBeDefined();
    });
  });

  describe('Zalo Instance', () => {
    test('Tạo Zalo instance với options', () => {
      const zaloInstance = new Zalo({
        selfListen: false,
        logging: false,
      });
      expect(zaloInstance).toBeDefined();
    });
  });
});

describe('Zalo Credentials Parsing', () => {
  test('Parse ZALO_CREDENTIALS_BASE64 hợp lệ', () => {
    const testCredentials = {
      uid: '123456789',
      cookie: { version: 'test' },
      secretKey: 'test-key',
    };
    const base64 = Buffer.from(JSON.stringify(testCredentials)).toString('base64');
    
    const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    expect(decoded.uid).toBe('123456789');
    expect(decoded.secretKey).toBe('test-key');
  });

  test('Parse ZALO_CREDENTIALS_BASE64 không hợp lệ', () => {
    const invalidBase64 = 'not-valid-base64!!!';
    
    expect(() => {
      JSON.parse(Buffer.from(invalidBase64, 'base64').toString('utf-8'));
    }).toThrow();
  });
});
