/**
 * Tool: createFile - Tạo và gửi file qua Zalo
 * Hỗ trợ: txt, docx (Word), pdf, pptx (PowerPoint), json, csv, code files, ...
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
import { textFileHandler } from './textHandler.js';
import { type FileHandler, MIME_TYPES } from './types.js';

// File handlers mapping
const FILE_HANDLERS: Record<string, FileHandler> = {
  // Documents
  docx: docxHandler,
  pdf: pdfHandler,
  pptx: pptxHandler,
  // Text files
  txt: textFileHandler,
  md: textFileHandler,
  json: textFileHandler,
  csv: textFileHandler,
  xml: textFileHandler,
  yaml: textFileHandler,
  yml: textFileHandler,
  // Web
  html: textFileHandler,
  css: textFileHandler,
  // JavaScript/TypeScript
  js: textFileHandler,
  ts: textFileHandler,
  jsx: textFileHandler,
  tsx: textFileHandler,
  // Other languages
  py: textFileHandler,
  java: textFileHandler,
  c: textFileHandler,
  cpp: textFileHandler,
  h: textFileHandler,
  cs: textFileHandler,
  go: textFileHandler,
  rs: textFileHandler,
  rb: textFileHandler,
  php: textFileHandler,
  sql: textFileHandler,
  sh: textFileHandler,
  bat: textFileHandler,
  ps1: textFileHandler,
  // Config
  log: textFileHandler,
  ini: textFileHandler,
  env: textFileHandler,
  gitignore: textFileHandler,
};

export const createFileTool: ITool = {
  name: 'createFile',
  description: `Tạo file và gửi qua Zalo. Hỗ trợ nhiều định dạng:
- Văn bản: txt, md
- Tài liệu: docx (Word), pdf, pptx (PowerPoint) - Full markdown support
- Data: json, csv, xml, yaml
- Code: js, ts, py, java, html, css, sql, sh, ...

**PPTX FORMAT:**
- Dùng "---" trên dòng riêng để tách các slides
- # Heading = Tiêu đề slide (to, màu xanh)
- ## Heading = Phụ đề slide (nhỏ hơn, màu xám)
- Dấu - hoặc * = Bullet points
- \`\`\`code\`\`\` = Code block

**VÍ DỤ PPTX:**
# Giới thiệu
## Tổng quan dự án
- Điểm 1
- Điểm 2
---
# Nội dung chính
- Chi tiết A
- Chi tiết B
---
# Kết luận
- Tóm tắt`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file KÈM ĐUÔI. Ví dụ: "report.docx", "slides.pptx"',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description:
        'Nội dung file. PPTX: dùng --- tách slides, # title, ## subtitle, - bullets. Xem description tool để biết format chi tiết.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề (dùng cho docx, pdf, pptx)',
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
      const ext = data.filename.split('.').pop()?.toLowerCase() || 'txt';
      const handler = FILE_HANDLERS[ext] || textFileHandler;
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
