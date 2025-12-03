/**
 * Tool: tvuSemesters - Lấy danh sách học kỳ TVU
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { tvuRequest } from "../services/tvuClient.js";
import { debugLog } from "../../../core/logger/logger.js";

interface SemesterData {
  hoc_ky_theo_ngay_hien_tai: number;
  ds_hoc_ky: Array<{
    hoc_ky: number;
    ten_hoc_ky: string;
  }>;
}

export const tvuSemestersTool: ToolDefinition = {
  name: "tvuSemesters",
  description:
    "Lấy danh sách tất cả học kỳ và học kỳ hiện tại của sinh viên TVU. Yêu cầu đã đăng nhập TVU.",
  parameters: [],
  execute: async (): Promise<ToolResult> => {
    try {
      debugLog("TVU:Semesters", "Fetching semesters");

      const response = await tvuRequest<SemesterData>(
        "/api/sch/w-locdshockytkbuser",
        {
          filter: { is_tieng_anh: null },
          additional: {
            paging: { limit: 100, page: 1 },
            ordering: [{ name: "hoc_ky", order_type: 1 }],
          },
        }
      );

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || "Không lấy được danh sách học kỳ",
        };
      }

      const d = response.data;
      return {
        success: true,
        data: {
          hocKyHienTai: d.hoc_ky_theo_ngay_hien_tai,
          danhSachHocKy: d.ds_hoc_ky.map((hk) => ({
            maHocKy: hk.hoc_ky,
            tenHocKy: hk.ten_hoc_ky,
          })),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy danh sách học kỳ: ${error.message}`,
      };
    }
  },
};
