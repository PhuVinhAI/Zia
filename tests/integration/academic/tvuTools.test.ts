/**
 * Integration Test: TVU Academic Tools
 * Test các tool liên quan đến hệ thống sinh viên TVU
 *
 * NOTE: Requires TVU credentials to run. Tests will be skipped if not configured.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { tvuStudentInfoTool } from '../../../src/modules/academic/tools/tvuStudentInfo.js';
import { tvuGradesTool } from '../../../src/modules/academic/tools/tvuGrades.js';
import { tvuScheduleTool } from '../../../src/modules/academic/tools/tvuSchedule.js';
import { tvuSemestersTool } from '../../../src/modules/academic/tools/tvuSemesters.js';
import { tvuTuitionTool } from '../../../src/modules/academic/tools/tvuTuition.js';
import { tvuNotificationsTool } from '../../../src/modules/academic/tools/tvuNotifications.js';
import { tvuCurriculumTool } from '../../../src/modules/academic/tools/tvuCurriculum.js';
import { tvuLogin, clearTvuToken } from '../../../src/modules/academic/services/tvuClient.js';
import { TEST_CONFIG, mockToolContext } from '../setup.js';

// TVU credentials from environment
const TVU_USERNAME = process.env.TVU_USERNAME;
const TVU_PASSWORD = process.env.TVU_PASSWORD;
const SKIP = !TVU_USERNAME || !TVU_PASSWORD;

describe.skipIf(SKIP)('TVU Academic Tools Integration', () => {
  let currentSemester: number | null = null;

  beforeAll(async () => {
    if (SKIP) {
      console.log('⏭️  Skipping TVU tools tests: TVU_USERNAME/TVU_PASSWORD not configured');
      return;
    }
    // Login first
    clearTvuToken();
    await tvuLogin(TVU_USERNAME!, TVU_PASSWORD!);
  });

  describe('tvuStudentInfo', () => {
    test('tvuStudentInfo - lấy thông tin sinh viên', async () => {
      const result = await tvuStudentInfoTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.maSV).toBeDefined();
      expect(result.data.hoTen).toBeDefined();
      expect(result.data.lop).toBeDefined();
    }, TEST_CONFIG.timeout);
  });

  describe('tvuSemesters', () => {
    test('tvuSemesters - lấy danh sách học kỳ', async () => {
      const result = await tvuSemestersTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.hocKyHienTai).toBeDefined();
      expect(result.data.danhSachHocKy).toBeArray();
      expect(result.data.danhSachHocKy.length).toBeGreaterThan(0);
      currentSemester = result.data.hocKyHienTai;
      const hk = result.data.danhSachHocKy[0];
      expect(hk.maHocKy).toBeDefined();
      expect(hk.tenHocKy).toBeDefined();
    }, TEST_CONFIG.timeout);
  });

  describe('tvuGrades', () => {
    test('tvuGrades - lấy bảng điểm', async () => {
      const result = await tvuGradesTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.danhSachHocKy).toBeArray();
      if (result.data.danhSachHocKy.length > 0) {
        const hk = result.data.danhSachHocKy[0];
        expect(hk.maHocKy).toBeDefined();
        expect(hk.tenHocKy).toBeDefined();
        expect(hk.diemTBHocKy).toBeDefined();
        expect(hk.danhSachMon).toBeArray();
      }
    }, TEST_CONFIG.timeout);
  });

  describe('tvuSchedule', () => {
    test('tvuSchedule - lấy thời khóa biểu', async () => {
      const hocKy = currentSemester || 20241;
      const result = await tvuScheduleTool.execute({ hocKy }, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.hocKy).toBe(hocKy);
      expect(result.data.danhSachTuan).toBeArray();
    }, TEST_CONFIG.timeout);

    test('tvuSchedule - validation error (thiếu hocKy)', async () => {
      const result = await tvuScheduleTool.execute({}, mockToolContext);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('tvuTuition', () => {
    test('tvuTuition - lấy thông tin học phí', async () => {
      const result = await tvuTuitionTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.tongConNo).toBeDefined();
      expect(result.data.danhSachHocKy).toBeArray();
    }, TEST_CONFIG.timeout);
  });

  describe('tvuNotifications', () => {
    test('tvuNotifications - lấy thông báo', async () => {
      const result = await tvuNotificationsTool.execute({ limit: 10 }, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.soThongBaoChuaDoc).toBeDefined();
      expect(result.data.danhSachThongBao).toBeArray();
      if (result.data.danhSachThongBao.length > 0) {
        const tb = result.data.danhSachThongBao[0];
        expect(tb.id).toBeDefined();
        expect(tb.tieuDe).toBeDefined();
        expect(tb.ngayGui).toBeDefined();
      }
    }, TEST_CONFIG.timeout);

    test('tvuNotifications - với limit khác', async () => {
      const result = await tvuNotificationsTool.execute({ limit: 5 }, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.danhSachThongBao.length).toBeLessThanOrEqual(5);
    }, TEST_CONFIG.timeout);
  });

  describe('tvuCurriculum', () => {
    test('tvuCurriculum - lấy chương trình đào tạo', async () => {
      const result = await tvuCurriculumTool.execute({}, mockToolContext);
      expect(result.success).toBe(true);
      expect(result.data.nganh).toBeDefined();
      expect(result.data.tienDoTongThe).toBeDefined();
      expect(result.data.danhSachHocKy).toBeArray();
      if (result.data.danhSachHocKy.length > 0) {
        const hk = result.data.danhSachHocKy[0];
        expect(hk.thuTuHocKy).toBeDefined();
        expect(hk.tienDo).toBeDefined();
        expect(hk.danhSachMon).toBeArray();
      }
    }, TEST_CONFIG.timeout);
  });
});


// ═══════════════════════════════════════════════════
// TVU Client Service Tests (từ tvu.test.ts đã merge)
// ═══════════════════════════════════════════════════

import { tvuRequest, getTvuToken } from '../../../src/modules/academic/services/tvuClient.js';

describe.skipIf(SKIP)('TVU Client Service', () => {
  test('tvuLogin - đăng nhập thành công', async () => {
    clearTvuToken();
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

  test('tvuRequest - raw API call thông tin sinh viên', async () => {
    const result = await tvuRequest<any>('/api/sinhvien/thongtinsinhvien');

    expect(result).toBeDefined();
    expect(result.result).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('tvuRequest - raw API call danh sách học kỳ', async () => {
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

// Tests không cần authentication
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
