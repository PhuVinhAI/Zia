/**
 * Tool: createFile - Tạo và gửi file qua Zalo
 * Hỗ trợ: txt, docx (Word), json, csv, html, css, js, ts, py, md, xml, yaml, sql, ...
 */

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ITool, ToolResult } from '../../../core/types.js';
import {
  type CreateFileParams,
  CreateFileSchema,
  validateParams,
} from '../../../shared/schemas/tools.schema.js';

// ═══════════════════════════════════════════════════
// FILE TYPE HANDLERS
// ═══════════════════════════════════════════════════

type FileHandler = (content: string, options?: CreateFileParams) => Promise<Buffer>;

/**
 * Handler cho file text thuần (txt, json, csv, code files, etc.)
 */
const textFileHandler: FileHandler = async (content: string): Promise<Buffer> => {
  return Buffer.from(content, 'utf-8');
};

/**
 * Handler cho file Word (.docx)
 * Hỗ trợ markdown cơ bản: # heading, **bold**, *italic*, - bullet
 */
const wordFileHandler: FileHandler = async (
  content: string,
  options?: CreateFileParams,
): Promise<Buffer> => {
  const paragraphs = parseContentToParagraphs(content);

  const doc = new Document({
    creator: options?.author || 'Zia AI Bot',
    title: options?.title || options?.filename || 'Document',
    description: 'Tài liệu được tạo bởi Zia AI Bot',
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // Title nếu có
          ...(options?.title
            ? [
                new Paragraph({
                  heading: HeadingLevel.TITLE,
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: options.title,
                      bold: true,
                      size: 48,
                    }),
                  ],
                  spacing: { after: 400 },
                }),
              ]
            : []),
          ...paragraphs,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

/**
 * Parse markdown-like content thành các Paragraph cho docx
 */
function parseContentToParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 200 } }));
      continue;
    }

    // Heading levels
    if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.slice(4), bold: true })],
          spacing: { before: 240, after: 120 },
        }),
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.slice(3), bold: true })],
          spacing: { before: 280, after: 140 },
        }),
      );
    } else if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.slice(2), bold: true })],
          spacing: { before: 320, after: 160 },
        }),
      );
    }
    // Bullet list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInlineFormatting(trimmed.slice(2)),
          spacing: { after: 80 },
        }),
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      paragraphs.push(
        new Paragraph({
          numbering: { reference: 'default-numbering', level: 0 },
          children: parseInlineFormatting(text),
          spacing: { after: 80 },
        }),
      );
    }
    // Normal paragraph
    else {
      paragraphs.push(
        new Paragraph({
          children: parseInlineFormatting(trimmed),
          spacing: { after: 120 },
        }),
      );
    }
  }

  return paragraphs;
}

/**
 * Parse inline formatting: **bold**, *italic*, ***bold italic***
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[5]) {
      runs.push(new TextRun({ text: match[5] }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ═══════════════════════════════════════════════════
// FILE TYPE MAPPING
// ═══════════════════════════════════════════════════

const FILE_HANDLERS: Record<string, FileHandler> = {
  // Word document
  docx: wordFileHandler,

  // Text files (all use textFileHandler)
  txt: textFileHandler,
  md: textFileHandler,
  json: textFileHandler,
  csv: textFileHandler,
  xml: textFileHandler,
  yaml: textFileHandler,
  yml: textFileHandler,
  html: textFileHandler,
  css: textFileHandler,
  js: textFileHandler,
  ts: textFileHandler,
  jsx: textFileHandler,
  tsx: textFileHandler,
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
  log: textFileHandler,
  ini: textFileHandler,
  env: textFileHandler,
  gitignore: textFileHandler,
};

const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  py: 'text/x-python',
  sql: 'application/sql',
};

// ═══════════════════════════════════════════════════
// TOOL DEFINITION
// ═══════════════════════════════════════════════════

export const createFileTool: ITool = {
  name: 'createFile',
  description: `Tạo file và gửi qua Zalo. Hỗ trợ nhiều định dạng:
- Văn bản: txt, md (markdown)
- Tài liệu: docx (Word - hỗ trợ # heading, **bold**, *italic*, - bullet)
- Data: json, csv, xml, yaml
- Code: js, ts, py, java, html, css, sql, sh, ...

Dùng khi user yêu cầu tạo/xuất file, tài liệu, code, data.`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file KÈM ĐUÔI MỞ RỘNG. Ví dụ: "report.docx", "data.json", "script.py"',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung file. Với .docx hỗ trợ markdown cơ bản.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề (chỉ dùng cho .docx)',
      required: false,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Tên tác giả (chỉ dùng cho .docx)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParams(CreateFileSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data as CreateFileParams;

    try {
      // Extract extension
      const ext = data.filename.split('.').pop()?.toLowerCase() || 'txt';
      const handler = FILE_HANDLERS[ext];

      if (!handler) {
        // Fallback to text handler for unknown extensions
        const buffer = await textFileHandler(data.content);
        return {
          success: true,
          data: {
            fileBuffer: buffer,
            filename: data.filename,
            mimeType: 'application/octet-stream',
            fileSize: buffer.length,
            fileType: ext,
          },
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
