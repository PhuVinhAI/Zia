/**
 * Integration Test: TVU Academic API
 * Test các chức năng liên quan đến hệ thống sinh viên TVU
 *
 * NOTE: Requires TVU credentials to run. Tests will be skipped if not configured.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  tvuLogin,
  tvuRequest,
  getTvuToken,
  clearTvuToken,
} from '../../../src/modules/academic/services/tvuClient.js';
import { TEST_CONFIG } from '../setup.js';

// TVU credentials from environment
const TVU_USERNAME = process.env.TVU_USERNAME;
const TVU_PASSWORD = process.env.TVU_PASSWORD;
const SKIP = !TVU_USERNAME || !TVU_PASSWORD;

describe.skipIf(SKIP)('TVU Academic API Integration', () => {
  beforeAll(() => {
    if (SKIP) {
      console.log('⏭️  Skipping TVU tests: TVU_USERNAME/TVU_PASSWORD not configured');
    }
    // Clear any existing token
    clearTvuToken();
  });

  test('tvuLogin - đăng nhập thành công', async () => {
    const result = await tvuLogin(TVU_USERNAME!, TVU_PASSWORD!);

    expect(result).toBeDefined();
    expect(result.access_token).toBeDefined();
    expect(result.user_id).toBeDefined();
    expect(result.user_name).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getTvuToken - lấy token sau khi login', () => {
    const token = getTvuToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('tvuRequest - lấy thông tin sinh viên', async () => {
    const result = await tvuRequest<any>('/api/sinhvien/thongtinsinhvien');

    expect(result).toBeDefined();
    expect(result.result).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('tvuRequest - lấy danh sách học kỳ', async () => {
    const result = await tvuRequest<any>('/api/sinhvien/danhsachhocky');

    expect(result).toBeDefined();
    expect(result.result).toBe(true);
    expect(result.data).toBeArray();
  }, TEST_CONFIG.timeout);

  test('clearTvuToken - xóa token', () => {
    clearTvuToken();
    const token = getTvuToken();
    expect(token).toBeNull();
  });
});

// Tests that don't require authentication
describe('TVU Client Utilities', () => {
  test('getTvuToken - trả về null khi chưa login', () => {
    clearTvuToken();
    const token = getTvuToken();
    expect(token).toBeNull();
  });

  test('clearTvuToken - không lỗi khi gọi nhiều lần', () => {
    clearTvuToken();
    clearTvuToken();
    clearTvuToken();
    expect(getTvuToken()).toBeNull();
  });
});
