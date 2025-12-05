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
  description: `Tạo file Office chuyên nghiệp với Word Framework đầy đủ tính năng.
Hỗ trợ: docx (Word), pdf, pptx (PowerPoint), xlsx (Excel)

**═══ DOCX (Word) - FULL FRAMEWORK ═══**

**TEXT:** # heading (1-6), **bold**, *italic*, ~~strike~~, \`code\`, [link](url)
**ALIGNMENT:** ->centered<- hoặc ->right aligned
**HIGHLIGHT:** ==text== hoặc [HIGHLIGHT:color]text[/HIGHLIGHT] (yellow/green/cyan/magenta/blue/red)
**MATH:** $E=mc^2$ inline, $$sum$$ block (LaTeX: \\alpha \\beta \\pi \\sum \\int \\infty ^2 _n)

**LISTS:** - bullet, 1. numbered, - [ ] checklist, - [x] checked
**DEFINITION:** Term rồi dòng tiếp theo : Definition
**BLOCKQUOTE:** > quoted text
**CODE:** \`\`\`lang code \`\`\`

**TABLES:** | Col1 | Col2 | (auto header styling, striped rows)

**CALLOUTS:** [!INFO], [!TIP], [!NOTE], [!WARNING], [!IMPORTANT], [!SUCCESS], [!ERROR] text
**BOXES:** [BOX:type:title]content[/BOX] (info/success/warning/error/note/quote/code)

**DIVIDERS:** [DIVIDER], [DIVIDER:dashed/dotted/double/wave/thick], [DIVIDER:decorated:text], [DIVIDER:star/floral]
**BADGES:** [BADGE:text:type] (default/primary/success/warning/danger/info)
**ICONS:** [ICON:emoji:size] (small/medium/large)
**EMOJIS:** :check: :x: :warning: :info: :star: :fire: :heart: :rocket: :bulb: :thumbsup:

**COVER:** [COVER:title:subtitle:author:org:date:version:style] (simple/professional/academic/modern)
**PAGE BREAK:** [PAGE_BREAK] hoặc ---PAGE---
**IMAGES:** ![alt](url) hoặc [IMAGE:data,width=400,height=300,caption="text"]
**SIGNATURE:** [SIGNATURE:name:title:company:date]
**APPROVAL:** [APPROVAL:approverName:title|creatorName:title]
**WATERMARK:** [WATERMARK:text] hoặc [WATERMARK:text:color] (predefined: draft/confidential/sample/urgent/approved)

**OPTIONS (đầu content):**
<!--OPTIONS: {"theme":{"name":"professional"},"pageSize":"A4","orientation":"portrait","includeToc":true,"tocTitle":"Mục Lục","header":{"text":"Header","includePageNumber":true},"footer":{"text":"Footer","alignment":"center"},"watermark":{"text":"DRAFT"}} -->

**THEMES:** default, professional, modern, academic, minimal
**PAGE:** A4/Letter/Legal, portrait/landscape

**═══ PPTX ═══** --- tách slides, # title, ## subtitle, - bullets
**═══ XLSX ═══** | markdown table | hoặc CSV format`,
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
