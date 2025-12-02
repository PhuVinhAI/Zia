/**
 * Tool: tvuStudentInfo - Lấy thông tin cá nhân sinh viên TVU
 */
import { ToolDefinition, ToolResult } from "../types.js";
import { tvuRequest } from "./tvuClient.js";
import { debugLog } from "../../utils/logger.js";

interface StudentInfoData {
  ma_sv: string;
  ten_day_du: string;
  gioi_tinh: string;
  ngay_sinh: string;
  noi_sinh: string;
  lop: string;
  khoa: string;
  nganh: string;
  chuyen_nganh: string;
  khoa_hoc: string;
  he_dao_tao: string;
  email: string;
  dien_thoai: string;
  so_cmnd: string;
  hien_dien_sv: string;
}

export const tvuStudentInfoTool: ToolDefinition = {
  name: "tvuStudentInfo",
  description:
    "Lấy thông tin cá nhân của sinh viên TVU (họ tên, lớp, khoa, ngành, email, SĐT...). Yêu cầu đã đăng nhập TVU.",
  parameters: [],
  execute: async (): Promise<ToolResult> => {
    try {
      debugLog("TVU:StudentInfo", "Fetching student info");

      const response = await tvuRequest<StudentInfoData>(
        "/api/dkmh/w-locsinhvieninfo",
        {}
      );

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || "Không lấy được thông tin sinh viên",
        };
      }

      const d = response.data;
      return {
        success: true,
        data: {
          maSV: d.ma_sv,
          hoTen: d.ten_day_du,
          gioiTinh: d.gioi_tinh,
          ngaySinh: d.ngay_sinh,
          noiSinh: d.noi_sinh,
          lop: d.lop,
          khoa: d.khoa,
          nganh: d.nganh,
          chuyenNganh: d.chuyen_nganh,
          khoaHoc: d.khoa_hoc,
          heDaoTao: d.he_dao_tao,
          email: d.email,
          dienThoai: d.dien_thoai,
          soCMND: d.so_cmnd,
          trangThai: d.hien_dien_sv,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy thông tin sinh viên: ${error.message}`,
      };
    }
  },
};
