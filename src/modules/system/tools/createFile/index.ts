/**
 * Tool: createFile - Tạo và gửi file Office qua Zalo
 * Hỗ trợ: docx (Word), pdf, pptx (PowerPoint), xlsx (Excel)
 * Các file text thuần (txt, md, code) sẽ được gửi trực tiếp qua markdown
 */

import type { ITool, ToolResult } from '../../../../core/types.js';
import {
  type CreateFileParams,
  CreateFileSchema,
  validateParams,
} from '../../../../shared/schemas/tools.schema.js';
import { docxHandler } from './docxHandler.js';
import { pdfHandler } from './pdfHandler.js';
import { pptxHandler } from './pptxHandler.js';
import { xlsxHandler } from './xlsxHandler.js';
import { type FileHandler, MIME_TYPES } from './types.js';

// File handlers mapping (chỉ Office documents)
const FILE_HANDLERS: Record<string, FileHandler> = {
  docx: docxHandler,
  pdf: pdfHandler,
  pptx: pptxHandler,
  xlsx: xlsxHandler,
};

// Supported extensions
const SUPPORTED_EXTENSIONS = Object.keys(FILE_HANDLERS);

export const createFileTool: ITool = {
  name: 'createFile',
  description: `Tạo file Office và gửi qua Zalo. CHỈ dùng cho các định dạng sau:
- docx (Word): Tài liệu văn bản, báo cáo
- pdf: Tài liệu PDF
- pptx (PowerPoint): Bài thuyết trình
- xlsx (Excel): Bảng tính, dữ liệu

⚠️ KHÔNG dùng tool này cho txt, md, json, csv, code files - chúng sẽ được gửi trực tiếp qua tin nhắn.

**PPTX FORMAT:**
- Dùng "---" trên dòng riêng để tách các slides
- # Heading = Tiêu đề slide
- ## Heading = Phụ đề slide
- Dấu - hoặc * = Bullet points

**XLSX FORMAT:**
- Dùng markdown table: | Col1 | Col2 |
- Hoặc CSV: value1,value2
- Dòng đầu tiên = Header (tự động bold + màu)

**VÍ DỤ XLSX:**
| Tên | Tuổi | Điểm |
|-----|------|------|
| An  | 20   | 8.5  |
| Bình| 22   | 9.0  |`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file KÈM ĐUÔI. Chỉ hỗ trợ: .docx, .pdf, .pptx, .xlsx',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung file. PPTX: dùng --- tách slides. XLSX: dùng markdown table hoặc CSV.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề tài liệu',
      required: false,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Tên tác giả',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParams(CreateFileSchema, params);
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data as CreateFileParams;

    try {
      const ext = data.filename.split('.').pop()?.toLowerCase() || '';
      const handler = FILE_HANDLERS[ext];

      if (!handler) {
        return {
          success: false,
          error: `Định dạng "${ext}" không được hỗ trợ. Chỉ hỗ trợ: ${SUPPORTED_EXTENSIONS.join(', ')}. Các file text/code sẽ được gửi trực tiếp qua tin nhắn.`,
        };
      }

      const buffer = await handler(data.content, data);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      return {
        success: true,
        data: {
          fileBuffer: buffer,
          filename: data.filename,
          mimeType,
          fileSize: buffer.length,
          fileType: ext,
          title: data.title,
          author: data.author,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo file: ${error.message}` };
    }
  },
};
