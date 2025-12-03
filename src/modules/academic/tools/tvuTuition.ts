/**
 * Tool: tvuTuition - Lấy thông tin học phí TVU
 */

import { debugLog } from '../../../core/logger/logger.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { tvuRequest } from '../services/tvuClient.js';

interface TuitionData {
  ds_hoc_phi_hoc_ky: Array<{
    ten_hoc_ky: string;
    phai_thu: number;
    mien_giam: number;
    da_thu: number;
    con_no: number;
    trang_thai: string;
  }>;
}

export const tvuTuitionTool: ToolDefinition = {
  name: 'tvuTuition',
  description:
    'Lấy thông tin học phí, công nợ và lịch sử đóng học phí của sinh viên TVU. Yêu cầu đã đăng nhập TVU.',
  parameters: [],
  execute: async (): Promise<ToolResult> => {
    try {
      debugLog('TVU:Tuition', 'Fetching tuition info');

      const response = await tvuRequest<TuitionData>('/api/rms/w-locdstonghophocphisv', {
        filter: {},
        additional: { paging: { limit: 100, page: 1 } },
      });

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || 'Không lấy được thông tin học phí',
        };
      }

      const formatMoney = (n: number) => `${n.toLocaleString('vi-VN')} VNĐ`;

      const semesters = response.data.ds_hoc_phi_hoc_ky.map((hk) => ({
        tenHocKy: hk.ten_hoc_ky,
        phaiThu: formatMoney(hk.phai_thu),
        mienGiam: formatMoney(hk.mien_giam),
        daThu: formatMoney(hk.da_thu),
        conNo: formatMoney(hk.con_no),
        trangThai: hk.trang_thai,
        raw: {
          phaiThu: hk.phai_thu,
          mienGiam: hk.mien_giam,
          daThu: hk.da_thu,
          conNo: hk.con_no,
        },
      }));

      // Tính tổng
      const tongConNo = response.data.ds_hoc_phi_hoc_ky.reduce((sum, hk) => sum + hk.con_no, 0);

      return {
        success: true,
        data: {
          tongConNo: formatMoney(tongConNo),
          tongConNoRaw: tongConNo,
          danhSachHocKy: semesters,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy thông tin học phí: ${error.message}`,
      };
    }
  },
};
