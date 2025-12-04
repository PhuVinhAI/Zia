/**
 * PDF Handler - Tao file PDF voi markdown support va Vietnamese font
 */

import PDFDocument from 'pdfkit';
import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';
import {
  type Block,
  hasStyle,
  type InlineToken,
  parseMarkdown,
} from '../../../../shared/utils/markdownParser.js';
import type { FileHandler } from './types.js';

type PDFDoc = InstanceType<typeof PDFDocument>;

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
    /* ignore */
  }
  return false;
}

function getPdfFont(isBold: boolean, isItalic: boolean, isCode: boolean): string {
  if (isCode) return 'Courier';
  if (unicodeFontsAvailable) {
    if (isBold && isItalic) return 'UniFont-BoldItalic';
    if (isBold) return 'UniFont-Bold';
    if (isItalic) return 'UniFont-Italic';
    return 'UniFont';
  }
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
      const bullet = block.indent === 0 ? '- ' : block.indent === 1 ? '  o ' : '    * ';
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

export const pdfHandler: FileHandler = async (
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
      for (const block of blocks) renderPdfBlock(doc, block);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};
