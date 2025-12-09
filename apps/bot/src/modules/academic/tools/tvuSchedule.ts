/**
 * Tool: tvuSchedule - Lấy thời khóa biểu TVU
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  TvuScheduleSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { tvuRequest } from '../services/tvuClient.js';

interface ScheduleData {
  ds_tuan_tkb: Array<{
    tuan_hoc_ky: number;
    ngay_bat_dau: string;
    ngay_ket_thuc: string;
    ds_thoi_khoa_bieu: Array<{
      ma_mon: string;
      ten_mon: string;
      tiet_bat_dau: number;
      so_tiet: number;
      ma_phong: string;
      ten_phong: string;
      ten_giang_vien: string;
      thu_kieu_so: number;
    }>;
  }>;
}

export const tvuScheduleTool: ToolDefinition = {
  name: 'tvuSchedule',
  description: 'Lấy thời khóa biểu của một học kỳ. Yêu cầu đã đăng nhập TVU.',
  parameters: [
    {
      name: 'hocKy',
      type: 'number',
      description: 'Mã học kỳ (VD: 20241). Lấy từ tool tvuSemesters.',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(TvuScheduleSchema, params, 'tvuSchedule');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      debugLog('TVU:Schedule', `Fetching schedule for semester ${data.hocKy}`);

      const response = await tvuRequest<ScheduleData>('/api/sch/w-locdstkbtuanusertheohocky', {
        filter: { hoc_ky: data.hocKy, ten_hoc_ky: '' },
        additional: {
          paging: { limit: 100, page: 1 },
          ordering: [{ name: null, order_type: null }],
        },
      });

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || 'Không lấy được thời khóa biểu',
        };
      }

      const thuMap: Record<number, string> = {
        2: 'Thứ 2',
        3: 'Thứ 3',
        4: 'Thứ 4',
        5: 'Thứ 5',
        6: 'Thứ 6',
        7: 'Thứ 7',
        8: 'Chủ nhật',
      };

      const weeks = response.data.ds_tuan_tkb.map((week) => ({
        tuanHocKy: week.tuan_hoc_ky,
        ngayBatDau: week.ngay_bat_dau,
        ngayKetThuc: week.ngay_ket_thuc,
        lichHoc: week.ds_thoi_khoa_bieu.map((item) => ({
          maMon: item.ma_mon,
          tenMon: item.ten_mon,
          thu: thuMap[item.thu_kieu_so] || `Thứ ${item.thu_kieu_so}`,
          tietBatDau: item.tiet_bat_dau,
          soTiet: item.so_tiet,
          phong: item.ten_phong || item.ma_phong,
          giangVien: item.ten_giang_vien,
        })),
      }));

      return {
        success: true,
        data: { hocKy: data.hocKy, danhSachTuan: weeks },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy thời khóa biểu: ${error.message}`,
      };
    }
  },
};
