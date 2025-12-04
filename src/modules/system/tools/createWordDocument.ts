/**
 * Tool: createWordDocument - Tạo file Word (.docx) và gửi qua Zalo
 * Sử dụng thư viện docx để tạo file Word từ nội dung AI generate
 */

import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ITool, ToolResult } from '../../../core/types.js';
import {
  type CreateWordDocumentParams,
  CreateWordDocumentSchema,
  validateParams,
} from '../../../shared/schemas/tools.schema.js';

/**
 * Parse markdown-like content thành các Paragraph cho docx
 * Hỗ trợ: # heading, **bold**, *italic*, - bullet, 1. numbered list
 */
function parseContentToParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line = spacing
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
  // Regex để match **bold**, *italic*, ***bold italic***
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // ***bold italic***
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      // **bold**
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      // *italic*
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[5]) {
      // normal text
      runs.push(new TextRun({ text: match[5] }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export const createWordDocumentTool: ITool = {
  name: 'createWordDocument',
  description: `Tạo file Word (.docx) từ nội dung văn bản và gửi qua Zalo.
Hỗ trợ định dạng markdown cơ bản:
- # Heading 1, ## Heading 2, ### Heading 3
- **bold**, *italic*, ***bold italic***
- Bullet list (- item)
- Numbered list (1. item)

Dùng khi user yêu cầu tạo tài liệu, báo cáo, văn bản Word.`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file (không cần đuôi .docx). Ví dụ: "bao_cao_thang_12"',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề chính của tài liệu (hiển thị đầu file)',
      required: false,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung văn bản (hỗ trợ markdown cơ bản)',
      required: true,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Tên tác giả (metadata)',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParams(CreateWordDocumentSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data as CreateWordDocumentParams;

    try {
      // Parse content thành paragraphs
      const contentParagraphs = parseContentToParagraphs(data.content);

      // Tạo document
      const doc = new Document({
        creator: data.author || 'Zia AI Bot',
        title: data.title || data.filename,
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
              ...(data.title
                ? [
                    new Paragraph({
                      heading: HeadingLevel.TITLE,
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: data.title,
                          bold: true,
                          size: 48, // 24pt
                        }),
                      ],
                      spacing: { after: 400 },
                    }),
                  ]
                : []),
              // Content
              ...contentParagraphs,
            ],
          },
        ],
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      const filename = data.filename.endsWith('.docx') ? data.filename : `${data.filename}.docx`;

      return {
        success: true,
        data: {
          document: buffer,
          filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileSize: buffer.length,
          title: data.title,
          author: data.author || 'Zia AI Bot',
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo file Word: ${error.message}` };
    }
  },
};
