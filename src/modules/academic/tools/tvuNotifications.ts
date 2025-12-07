/**
 * Tool: tvuNotifications - Lấy thông báo từ TVU
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  TvuNotificationsSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { tvuRequest } from '../services/tvuClient.js';

interface NotificationData {
  notification: number;
  ds_thong_bao: Array<{
    id: number;
    tieu_de: string;
    noi_dung: string;
    ngay_gui: string;
    nguoi_gui: string;
    doi_tuong_search: string;
    is_da_doc: boolean;
    is_phai_xem: boolean;
  }>;
}

export const tvuNotificationsTool: ToolDefinition = {
  name: 'tvuNotifications',
  description: 'Lấy danh sách thông báo từ nhà trường TVU. Yêu cầu đã đăng nhập TVU.',
  parameters: [
    {
      name: 'limit',
      type: 'number',
      description: 'Số lượng thông báo cần lấy (mặc định 20)',
      required: false,
      default: 20,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(
      TvuNotificationsSchema,
      params,
      'tvuNotifications',
    );
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      debugLog('TVU:Notifications', `Fetching ${data.limit} notifications`);

      const response = await tvuRequest<NotificationData>('/api/web/w-locdsthongbao', {
        filter: { id: null, is_noi_dung: true, is_web: true },
        additional: {
          paging: { limit: data.limit, page: 1 },
          ordering: [{ name: 'ngay_gui', order_type: 1 }],
        },
      });

      if (!response.result || !response.data) {
        return {
          success: false,
          error: response.message || 'Không lấy được thông báo',
        };
      }

      const d = response.data;
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

      const notifications = d.ds_thong_bao.map((tb) => ({
        id: tb.id,
        tieuDe: tb.tieu_de,
        noiDung: stripHtml(tb.noi_dung).substring(0, 500),
        ngayGui: tb.ngay_gui,
        nguoiGui: tb.nguoi_gui,
        doiTuong: tb.doi_tuong_search,
        daDoc: tb.is_da_doc,
        quanTrong: tb.is_phai_xem,
      }));

      return {
        success: true,
        data: {
          soThongBaoChuaDoc: d.notification,
          danhSachThongBao: notifications,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy thông báo: ${error.message}`,
      };
    }
  },
};
