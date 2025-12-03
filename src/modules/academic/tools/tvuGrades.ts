/**
 * Tool: tvuGrades - Lấy bảng điểm sinh viên TVU
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { tvuRequest } from "../services/tvuClient.js";
import { debugLog } from "../../../core/logger/logger.js";

interface GradesData {
  ds_diem_hocky: Array<{
    hoc_ky: string;
    ten_hoc_ky: string;
    dtb_hk_he10: string;
    dtb_hk_he4: string;
    dtb_tich_luy_he_10: string;
    dtb_tich_luy_he_4: string;
    so_tin_chi_dat_hk: string;
    so_tin_chi_dat_tich_luy: string;
    xep_loai_tkb_hk: string;
    ds_diem_mon_hoc: Array<{
      ma_mon: string;
      ten_mon: string;
      so_tin_chi: number;
      diem_tk: string;
      diem_tk_so: string;
      diem_tk_chu: string;
      ket_qua: number;
      ds_diem_thanh_phan: Array<{
        ky_hieu: string;
        ten_thanh_phan: string;
        trong_so: string;
        diem_thanh_phan: string;
      }>;
    }>;
  }>;
}

export const tvuGradesTool: ToolDefinition = {
  name: "tvuGrades",
  description:
    "Lấy toàn bộ bảng điểm của sinh viên TVU (điểm từng môn, điểm trung bình, tín chỉ tích lũy...). Yêu cầu đã đăng nhập TVU.",
  parameters: [],
  execute: async (): Promise<ToolResult> => {
    try {
      debugLog("TVU:Grades", "Fetching grades");

      const response = await tvuRequest<GradesData>(
        "/api/srm/w-locdsdiemsinhvien",
        {
          filter: { is_tinh_diem: true },
          additional: { paging: { limit: 1000, page: 1 } },
        },
        { hien_thi_mon_theo_hkdk: "false" }
      );

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || "Không lấy được bảng điểm",
        };
      }

      const semesters = response.data.ds_diem_hocky.map((hk) => ({
        maHocKy: hk.hoc_ky,
        tenHocKy: hk.ten_hoc_ky,
        diemTBHocKy: {
          he10: hk.dtb_hk_he10,
          he4: hk.dtb_hk_he4,
        },
        diemTBTichLuy: {
          he10: hk.dtb_tich_luy_he_10,
          he4: hk.dtb_tich_luy_he_4,
        },
        tinChiDatHK: hk.so_tin_chi_dat_hk,
        tinChiTichLuy: hk.so_tin_chi_dat_tich_luy,
        xepLoai: hk.xep_loai_tkb_hk,
        danhSachMon: hk.ds_diem_mon_hoc.map((mon) => ({
          maMon: mon.ma_mon,
          tenMon: mon.ten_mon,
          soTinChi: mon.so_tin_chi,
          diemTK: mon.diem_tk,
          diemChu: mon.diem_tk_chu,
          ketQua: mon.ket_qua === 1 ? "Đạt" : "Không đạt",
          diemThanhPhan: mon.ds_diem_thanh_phan.map((tp) => ({
            kyHieu: tp.ky_hieu,
            ten: tp.ten_thanh_phan,
            trongSo: tp.trong_so,
            diem: tp.diem_thanh_phan,
          })),
        })),
      }));

      return {
        success: true,
        data: { danhSachHocKy: semesters },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy bảng điểm: ${error.message}`,
      };
    }
  },
};
