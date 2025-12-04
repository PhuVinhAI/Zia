/**
 * Tool: createFile - Tạo và gửi file qua Zalo
 * Hỗ trợ: txt, docx (Word), pdf, json, csv, html, css, js, ts, py, md, xml, yaml, sql, ...
 * Full markdown support cho docx và pdf
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';
import PDFDocument from 'pdfkit';
import type { ITool, ToolResult } from '../../../core/types.js';
import {
  type CreateFileParams,
  CreateFileSchema,
  validateParams,
} from '../../../shared/schemas/tools.schema.js';
import {
  type Block,
  hasStyle,
  type InlineToken,
  parseMarkdown,
} from '../../../shared/utils/markdownParser.js';

// ═══════════════════════════════════════════════════
// FILE TYPE HANDLERS
// ═══════════════════════════════════════════════════

type FileHandler = (content: string, options?: CreateFileParams) => Promise<Buffer>;

const textFileHandler: FileHandler = async (content: string): Promise<Buffer> => {
  // Normalize newlines: convert literal \n to actual newline
  const normalizedContent = content
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\t/g, '\t');
  return Buffer.from(normalizedContent, 'utf-8');
};

// ═══════════════════════════════════════════════════
// DOCX RENDERER
// ═══════════════════════════════════════════════════

function tokensToTextRuns(tokens: InlineToken[]): (TextRun | ExternalHyperlink)[] {
  return tokens.map((token) => {
    const isBold = hasStyle(token, 'bold') || hasStyle(token, 'boldItalic');
    const isItalic = hasStyle(token, 'italic') || hasStyle(token, 'boldItalic');
    const isStrike = hasStyle(token, 'strikethrough');
    const isCode = hasStyle(token, 'code');
    const isLink = hasStyle(token, 'link');

    if (isLink && token.href) {
      return new ExternalHyperlink({
        children: [
          new TextRun({
            text: token.text,
            style: 'Hyperlink',
            color: '0563C1',
            underline: { type: 'single' },
          }),
        ],
        link: token.href,
      });
    }

    return new TextRun({
      text: token.text,
      bold: isBold,
      italics: isItalic,
      strike: isStrike,
      font: isCode ? 'Consolas' : undefined,
      shading: isCode ? { type: ShadingType.SOLID, color: 'E8E8E8' } : undefined,
    });
  });
}

function blockToParagraph(block: Block): Paragraph | null {
  const headingMap: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    heading1: HeadingLevel.HEADING_1,
    heading2: HeadingLevel.HEADING_2,
    heading3: HeadingLevel.HEADING_3,
    heading4: HeadingLevel.HEADING_4,
  };

  switch (block.type) {
    case 'empty':
      return new Paragraph({ spacing: { after: 200 } });

    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
      return new Paragraph({
        heading: headingMap[block.type],
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { before: 280, after: 140 },
      });

    case 'bullet':
      return new Paragraph({
        bullet: { level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 80 },
      });

    case 'numbered':
      return new Paragraph({
        numbering: { reference: 'default-numbering', level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 80 },
      });

    case 'blockquote':
      return new Paragraph({
        children: tokensToTextRuns(block.tokens) as TextRun[],
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' } },
        spacing: { after: 120 },
      });

    case 'codeBlock':
      return new Paragraph({
        children: [new TextRun({ text: block.raw || '', font: 'Consolas', size: 20 })],
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        spacing: { before: 120, after: 120 },
      });

    case 'hr':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        spacing: { before: 200, after: 200 },
      });
    default:
      return new Paragraph({
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 120 },
      });
  }
}

const wordFileHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  const blocks = parseMarkdown(content);
  const paragraphs = blocks.map(blockToParagraph).filter((p): p is Paragraph => p !== null);

  const doc = new Document({
    creator: opts?.author || 'Zia AI Bot',
    title: opts?.title || opts?.filename || 'Document',
    description: 'Tài liệu được tạo bởi Zia AI Bot',
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START },
            { level: 1, format: 'lowerLetter', text: '%2)', alignment: AlignmentType.START },
            { level: 2, format: 'lowerRoman', text: '%3.', alignment: AlignmentType.START },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          ...(opts?.title
            ? [
                new Paragraph({
                  heading: HeadingLevel.TITLE,
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: opts.title, bold: true, size: 48 })],
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

// ═══════════════════════════════════════════════════
// PDF RENDERER
// ═══════════════════════════════════════════════════

type PDFDoc = InstanceType<typeof PDFDocument>;

function getPdfFont(isBold: boolean, isItalic: boolean, isCode: boolean): string {
  if (isCode) return 'Courier';

  if (unicodeFontsAvailable) {
    if (isBold && isItalic) return 'UniFont-BoldItalic';
    if (isBold) return 'UniFont-Bold';
    if (isItalic) return 'UniFont-Italic';
    return 'UniFont';
  }

  // Fallback to Helvetica (no Vietnamese support)
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function renderPdfTokens(doc: PDFDoc, tokens: InlineToken[], baseSize = 12): void {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isLast = i === tokens.length - 1;
    const isBold = hasStyle(token, 'bold') || hasStyle(token, 'boldItalic');
    const isItalic = hasStyle(token, 'italic') || hasStyle(token, 'boldItalic');
    const isCode = hasStyle(token, 'code');
    const isLink = hasStyle(token, 'link');

    const font = getPdfFont(isBold, isItalic, isCode);
    doc.font(font).fontSize(baseSize);

    if (isLink && token.href) {
      doc
        .fillColor('blue')
        .text(token.text, { continued: !isLast, link: token.href, underline: true });
      doc.fillColor('black');
    } else {
      doc.text(token.text, { continued: !isLast });
    }
  }
  if (tokens.length > 0) doc.text('');
}

function renderPdfBlock(doc: PDFDoc, block: Block): void {
  const defaultFont = getPdfFont(false, false, false);
  const boldFont = getPdfFont(true, false, false);
  const italicFont = getPdfFont(false, true, false);

  switch (block.type) {
    case 'empty':
      doc.moveDown(0.5);
      break;
    case 'heading1':
      doc.fontSize(24).font(boldFont);
      renderPdfTokens(doc, block.tokens, 24);
      doc.moveDown(0.5);
      break;
    case 'heading2':
      doc.fontSize(20).font(boldFont);
      renderPdfTokens(doc, block.tokens, 20);
      doc.moveDown(0.4);
      break;
    case 'heading3':
      doc.fontSize(16).font(boldFont);
      renderPdfTokens(doc, block.tokens, 16);
      doc.moveDown(0.3);
      break;
    case 'heading4':
      doc.fontSize(14).font(boldFont);
      renderPdfTokens(doc, block.tokens, 14);
      doc.moveDown(0.3);
      break;
    case 'bullet': {
      const indent = (block.indent || 0) * 20 + 20;
      const bullet = block.indent === 0 ? '• ' : block.indent === 1 ? '◦ ' : '▪ ';
      doc.fontSize(12).font(defaultFont).text(bullet, { continued: true, indent });
      renderPdfTokens(doc, block.tokens, 12);
      break;
    }
    case 'numbered': {
      const indent = (block.indent || 0) * 20 + 20;
      doc.fontSize(12).font(defaultFont).text('', { indent });
      renderPdfTokens(doc, block.tokens, 12);
      break;
    }
    case 'blockquote':
      doc.fontSize(12).font(italicFont).text('', { indent: 30 });
      renderPdfTokens(doc, block.tokens, 12);
      doc.moveDown(0.3);
      break;
    case 'codeBlock':
      doc
        .fontSize(10)
        .font('Courier')
        .text(block.raw || '');
      doc.moveDown(0.5);
      break;
    case 'hr':
      doc.moveDown(0.5);
      doc
        .moveTo(doc.x, doc.y)
        .lineTo(doc.x + 500, doc.y)
        .stroke('#CCCCCC');
      doc.moveDown(0.5);
      break;
    default:
      doc.fontSize(12).font(defaultFont);
      renderPdfTokens(doc, block.tokens, 12);
      doc.moveDown(0.3);
      break;
  }
}

// Font paths for different OS - supports Vietnamese/Unicode
const FONT_PATHS: Record<
  string,
  { regular: string; bold: string; italic: string; boldItalic: string }
> = {
  win32: {
    regular: 'C:/Windows/Fonts/arial.ttf',
    bold: 'C:/Windows/Fonts/arialbd.ttf',
    italic: 'C:/Windows/Fonts/ariali.ttf',
    boldItalic: 'C:/Windows/Fonts/arialbi.ttf',
  },
  linux: {
    regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    boldItalic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf',
  },
  darwin: {
    regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
    bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    italic: '/System/Library/Fonts/Supplemental/Arial Italic.ttf',
    boldItalic: '/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf',
  },
};

let unicodeFontsAvailable = false;

function registerUnicodeFonts(doc: PDFDoc): boolean {
  const platform = process.platform as keyof typeof FONT_PATHS;
  const fonts = FONT_PATHS[platform] || FONT_PATHS.linux;

  try {
    const fs = require('node:fs');
    if (fs.existsSync(fonts.regular)) {
      doc.registerFont('UniFont', fonts.regular);
      doc.registerFont('UniFont-Bold', fonts.bold);
      doc.registerFont('UniFont-Italic', fonts.italic);
      doc.registerFont('UniFont-BoldItalic', fonts.boldItalic);
      return true;
    }
  } catch {
    // Font registration failed
  }
  return false;
}

const pdfFileHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: opts?.title || opts?.filename || 'Document',
          Author: opts?.author || 'Zia AI Bot',
          Creator: 'Zia AI Bot',
        },
      });

      // Register Unicode fonts for Vietnamese support
      unicodeFontsAvailable = registerUnicodeFonts(doc);

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (opts?.title) {
        const titleFont = unicodeFontsAvailable ? 'UniFont-Bold' : 'Helvetica-Bold';
        doc.fontSize(28).font(titleFont).text(opts.title, { align: 'center' });
        doc.moveDown(1.5);
      }

      const blocks = parseMarkdown(content);
      for (const block of blocks) {
        renderPdfBlock(doc, block);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

// ═══════════════════════════════════════════════════
// FILE TYPE MAPPING
// ═══════════════════════════════════════════════════

const FILE_HANDLERS: Record<string, FileHandler> = {
  docx: wordFileHandler,
  pdf: pdfFileHandler,
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
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
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
- Văn bản: txt, md
- Tài liệu: docx (Word), pdf - Full markdown: # heading, **bold**, *italic*, ~~strike~~, \`code\`, [link](url), > quote, \`\`\`code block\`\`\`, ---, lists
- Data: json, csv, xml, yaml
- Code: js, ts, py, java, html, css, sql, sh, ...`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file KÈM ĐUÔI. Ví dụ: "report.docx", "report.pdf"',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung file. Với .docx và .pdf hỗ trợ full markdown.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề (dùng cho .docx và .pdf)',
      required: false,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Tên tác giả (dùng cho .docx và .pdf)',
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
