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
  description: `Tạo file Office chuyên nghiệp. Hỗ trợ: docx, pdf, pptx, xlsx

**DOCX (Word) - FULL FEATURES:**

📝 **Text Formatting:**
- Markdown: # heading (1-6), **bold**, *italic*, ~~strike~~, \`code\`, [link](url)
- Alignment: ->centered<- hoặc ->right aligned
- Highlight: ==highlighted text== hoặc [HIGHLIGHT:yellow]text[/HIGHLIGHT]
- Math: $inline math$ hoặc $$block math$$ (hỗ trợ LaTeX symbols)

📋 **Lists & Structure:**
- Bullet: - item (nested với indent)
- Numbered: 1. item
- Checklist: - [ ] unchecked, - [x] checked
- Blockquote: > quoted text

📊 **Tables:** | Col1 | Col2 | (auto-styled header, striped rows)

📦 **Boxes & Callouts:**
- Callouts: [!INFO], [!WARNING], [!SUCCESS], [!ERROR], [!TIP], [!NOTE] text
- Boxes: [BOX:type:title]content[/BOX] (type: info/success/warning/error/note/quote/code)

🎨 **Visual Elements:**
- Dividers: [DIVIDER], [DIVIDER:dashed], [DIVIDER:decorated:text]
- Badges: [BADGE:text:type] (type: primary/success/warning/danger/info)
- Icons: [ICON:star:large], emoji shortcuts :check:, :warning:, :star:

📄 **Document Structure:**
- Cover page: [COVER:title:subtitle:author:org:date:version:style]
- Page break: [PAGE_BREAK] hoặc ---PAGE---
- TOC: includeToc:true trong OPTIONS
- Signature: [SIGNATURE:name:title:company:date]
- Approval: [APPROVAL:approverName:title|creatorName:title]

⚙️ **Settings (đầu content):**
\`\`\`
<!--OPTIONS: {
  "theme":{"name":"professional"},
  "pageSize":"A4",
  "orientation":"portrait",
  "includeToc":true,
  "header":{"text":"Header","includePageNumber":true},
  "footer":{"text":"Footer","alignment":"center"}
} -->
\`\`\`
Themes: default, professional, modern, academic, minimal

**PPTX:** --- tách slides, # title, ## subtitle, - bullets
**XLSX:** | markdown table | hoặc CSV format`,
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
