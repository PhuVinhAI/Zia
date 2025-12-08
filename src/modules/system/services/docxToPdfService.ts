/**
 * DOCX to PDF Service - Convert DOCX to PDF locally using mammoth + pdfkit + sharp
 * Full support: text formatting, headings, lists, tables, images
 * Sử dụng font Roboto hỗ trợ tiếng Việt
 * Không cần API key
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { debugLog, logError } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// FONT LOADING
// ═══════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, '../../../assets/fonts');

// Load fonts as buffers
let FONT_REGULAR: Buffer;
let FONT_BOLD: Buffer;

try {
  FONT_REGULAR = readFileSync(join(FONTS_DIR, 'Roboto-Regular.ttf'));
  FONT_BOLD = readFileSync(join(FONTS_DIR, 'Roboto-Bold.ttf'));
  debugLog('DocxToPdf', '✓ Loaded Roboto fonts');
} catch {
  debugLog('DocxToPdf', '⚠ Could not load Roboto fonts, using Helvetica fallback');
}

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface ExtractedImage {
  id: string;
  contentType: string;
  buffer: Buffer;
  width?: number;
  height?: number;
}

interface ParsedElement {
  type:
    | 'heading'
    | 'paragraph'
    | 'list-item'
    | 'image'
    | 'table'
    | 'table-row'
    | 'table-cell'
    | 'break'
    | 'hr';
  content?: string;
  level?: number; // heading level or list indent
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  imageId?: string;
  children?: ParsedElement[];
  cells?: string[];
}

interface DocxParseResult {
  html: string;
  images: Map<string, ExtractedImage>;
  messages: string[];
}

// ═══════════════════════════════════════════════════
// DOCX PARSING
// ═══════════════════════════════════════════════════

/**
 * Parse DOCX và extract HTML + images
 */
async function parseDocxToHtml(docxBuffer: Buffer): Promise<DocxParseResult> {
  const images = new Map<string, ExtractedImage>();
  let imageIndex = 0;

  const result = await mammoth.convertToHtml(
    { buffer: docxBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const imageBuffer = await image.read();
          const contentType = image.contentType || 'image/png';
          const imageId = `img_${imageIndex++}`;

          // Get image dimensions using sharp
          let width: number | undefined;
          let height: number | undefined;
          let processedBuffer = Buffer.from(imageBuffer);

          try {
            const metadata = await sharp(processedBuffer).metadata();
            width = metadata.width;
            height = metadata.height;

            // Convert unsupported formats to PNG for PDFKit
            if (
              contentType !== 'image/png' &&
              contentType !== 'image/jpeg' &&
              contentType !== 'image/jpg'
            ) {
              processedBuffer = Buffer.from(await sharp(processedBuffer).png().toBuffer());
            }
          } catch {
            // If sharp fails, keep original buffer
            debugLog('DocxToPdf', `Could not process image ${imageId}, using original`);
          }

          images.set(imageId, {
            id: imageId,
            contentType,
            buffer: processedBuffer,
            width,
            height,
          });

          return { src: imageId };
        } catch (err) {
          debugLog('DocxToPdf', `Failed to extract image: ${err}`);
          return { src: '' };
        }
      }),
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        'b => strong',
        'i => em',
        'u => u',
        'strike => s',
      ],
    },
  );

  return {
    html: result.value,
    images,
    messages: result.messages.map((m) => m.message),
  };
}

// ═══════════════════════════════════════════════════
// HTML PARSING
// ═══════════════════════════════════════════════════

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

/**
 * Parse HTML thành elements cho PDF rendering
 */
function parseHtmlToElements(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];

  // Clean HTML
  html = html.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

  // Parse tables separately
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  let lastTableEnd = 0;
  const htmlParts: { type: 'html' | 'table'; content: string }[] = [];

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    if (tableMatch.index > lastTableEnd) {
      htmlParts.push({ type: 'html', content: html.slice(lastTableEnd, tableMatch.index) });
    }
    htmlParts.push({ type: 'table', content: tableMatch[0] });
    lastTableEnd = tableMatch.index + tableMatch[0].length;
  }
  if (lastTableEnd < html.length) {
    htmlParts.push({ type: 'html', content: html.slice(lastTableEnd) });
  }

  for (const part of htmlParts) {
    if (part.type === 'table') {
      const tableElement = parseTable(part.content);
      if (tableElement) elements.push(tableElement);
    } else {
      elements.push(...parseHtmlContent(part.content));
    }
  }

  return elements;
}

/**
 * Parse table HTML
 */
function parseTable(tableHtml: string): ParsedElement | null {
  const rows: ParsedElement[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;

    // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      // Strip HTML tags from cell content
      const cellContent = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      cells.push(decodeHtmlEntities(cellContent));
    }

    if (cells.length > 0) {
      rows.push({ type: 'table-row', cells });
    }
  }

  if (rows.length === 0) return null;

  return { type: 'table', children: rows };
}

/**
 * Parse non-table HTML content
 */
function parseHtmlContent(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];

  // Match block elements
  const blockRegex =
    /<(h[1-6]|p|li|hr|br|img)([^>]*)>([^<]*(?:<(?!\/?\1)[^<]*)*)<\/\1>|<(hr|br|img)([^>]*)\/?>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec pattern
  while ((match = blockRegex.exec(html)) !== null) {
    const tag = (match[1] || match[4] || '').toLowerCase();
    const attrs = match[2] || match[5] || '';
    const innerHtml = match[3] || '';

    // Handle self-closing tags
    if (tag === 'hr') {
      elements.push({ type: 'hr' });
      lastIndex = match.index + match[0].length;
      continue;
    }

    if (tag === 'br') {
      elements.push({ type: 'break' });
      lastIndex = match.index + match[0].length;
      continue;
    }

    if (tag === 'img') {
      const srcMatch = attrs.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) {
        elements.push({ type: 'image', imageId: srcMatch[1] });
      }
      lastIndex = match.index + match[0].length;
      continue;
    }

    // Parse inline formatting
    const { text, bold, italic, underline } = parseInlineFormatting(innerHtml);

    // Check for images inside paragraph
    const imgMatch = innerHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/);
    if (imgMatch) {
      elements.push({ type: 'image', imageId: imgMatch[1] });
    }

    if (text.trim()) {
      if (tag.startsWith('h')) {
        const level = Number.parseInt(tag[1], 10);
        elements.push({ type: 'heading', content: text.trim(), level, bold: true });
      } else if (tag === 'li') {
        elements.push({ type: 'list-item', content: text.trim(), bold, italic, underline });
      } else {
        elements.push({ type: 'paragraph', content: text.trim(), bold, italic, underline });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  return elements;
}

/**
 * Parse inline formatting (bold, italic, underline)
 */
function parseInlineFormatting(html: string): {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
} {
  let bold = false;
  let italic = false;
  let underline = false;

  // Check for formatting tags
  if (/<(strong|b)\b/i.test(html)) bold = true;
  if (/<(em|i)\b/i.test(html)) italic = true;
  if (/<u\b/i.test(html)) underline = true;

  // Strip all HTML tags
  const text = decodeHtmlEntities(html.replace(/<[^>]+>/g, ''));

  return { text, bold, italic, underline };
}

// ═══════════════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════════════

const FONT_SIZES = {
  h1: 24,
  h2: 20,
  h3: 16,
  h4: 14,
  h5: 12,
  h6: 11,
  body: 11,
  small: 9,
};

const LINE_HEIGHTS = {
  heading: 1.3,
  body: 1.4,
  list: 1.3,
};

// Font names for PDFKit
const FONT_NAME_REGULAR = 'Roboto';
const FONT_NAME_BOLD = 'Roboto-Bold';

/**
 * Register custom fonts with PDFDocument
 */
function registerFonts(doc: typeof PDFDocument.prototype): void {
  if (FONT_REGULAR && FONT_BOLD) {
    doc.registerFont(FONT_NAME_REGULAR, FONT_REGULAR);
    doc.registerFont(FONT_NAME_BOLD, FONT_BOLD);
  }
}

/**
 * Get font name based on formatting
 */
function getFont(bold: boolean, _italic: boolean): string {
  // Roboto không có italic variant, dùng regular thay thế
  if (FONT_REGULAR && FONT_BOLD) {
    return bold ? FONT_NAME_BOLD : FONT_NAME_REGULAR;
  }
  // Fallback to Helvetica
  if (bold) return 'Helvetica-Bold';
  return 'Helvetica';
}

/**
 * Get bold font name
 */
function getBoldFont(): string {
  return FONT_BOLD ? FONT_NAME_BOLD : 'Helvetica-Bold';
}

/**
 * Get regular font name
 */
function getRegularFont(): string {
  return FONT_REGULAR ? FONT_NAME_REGULAR : 'Helvetica';
}

/**
 * Render elements to PDF
 */
async function renderToPdf(
  elements: ParsedElement[],
  images: Map<string, ExtractedImage>,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    autoFirstPage: true,
  });

  // Register custom fonts
  registerFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

  /**
   * Check and add new page if needed
   */
  function checkNewPage(requiredHeight: number): void {
    const remainingHeight = doc.page.height - doc.page.margins.bottom - doc.y;
    if (remainingHeight < requiredHeight) {
      doc.addPage();
    }
  }

  for (const element of elements) {
    switch (element.type) {
      case 'heading': {
        const fontSize = FONT_SIZES[`h${element.level}` as keyof typeof FONT_SIZES] || FONT_SIZES.h3;
        checkNewPage(fontSize * LINE_HEIGHTS.heading + 20);

        doc.fontSize(fontSize).font(getBoldFont());
        doc.text(element.content || '', {
          width: pageWidth,
          lineGap: fontSize * (LINE_HEIGHTS.heading - 1),
        });
        doc.moveDown(0.5);
        break;
      }

      case 'paragraph': {
        checkNewPage(FONT_SIZES.body * LINE_HEIGHTS.body + 10);

        doc.fontSize(FONT_SIZES.body).font(getFont(!!element.bold, !!element.italic));

        if (element.underline) {
          doc.text(element.content || '', {
            width: pageWidth,
            lineGap: FONT_SIZES.body * (LINE_HEIGHTS.body - 1),
            underline: true,
          });
        } else {
          doc.text(element.content || '', {
            width: pageWidth,
            lineGap: FONT_SIZES.body * (LINE_HEIGHTS.body - 1),
          });
        }
        doc.moveDown(0.3);
        break;
      }

      case 'list-item': {
        checkNewPage(FONT_SIZES.body * LINE_HEIGHTS.list + 10);

        const indent = (element.level || 0) * 15 + 15;
        doc.fontSize(FONT_SIZES.body).font(getFont(!!element.bold, !!element.italic));
        doc.text(`• ${element.content || ''}`, doc.page.margins.left + indent, doc.y, {
          width: pageWidth - indent,
          lineGap: FONT_SIZES.body * (LINE_HEIGHTS.list - 1),
        });
        doc.moveDown(0.2);
        break;
      }

      case 'image': {
        const imageData = images.get(element.imageId || '');
        if (imageData?.buffer) {
          try {
            // Calculate dimensions
            let imgWidth = imageData.width || 400;
            let imgHeight = imageData.height || 300;

            // Scale to fit page width
            if (imgWidth > pageWidth) {
              const scale = pageWidth / imgWidth;
              imgWidth = pageWidth;
              imgHeight = imgHeight * scale;
            }

            // Scale to fit remaining page height
            const maxHeight = Math.min(pageHeight * 0.6, 400);
            if (imgHeight > maxHeight) {
              const scale = maxHeight / imgHeight;
              imgHeight = maxHeight;
              imgWidth = imgWidth * scale;
            }

            checkNewPage(imgHeight + 20);

            // Center image
            const x = doc.page.margins.left + (pageWidth - imgWidth) / 2;

            doc.image(imageData.buffer, x, doc.y, {
              width: imgWidth,
              height: imgHeight,
            });

            doc.y += imgHeight;
            doc.moveDown(0.5);

            debugLog('DocxToPdf', `✓ Embedded image ${element.imageId}: ${imgWidth}x${imgHeight}`);
          } catch (imgErr: any) {
            debugLog('DocxToPdf', `✗ Failed to embed image ${element.imageId}: ${imgErr.message}`);
          }
        }
        break;
      }

      case 'table': {
        if (!element.children || element.children.length === 0) break;

        // Calculate column widths
        const maxCols = Math.max(...element.children.map((row) => row.cells?.length || 0));
        const colWidth = pageWidth / maxCols;
        const cellPadding = 5;
        const rowHeight = FONT_SIZES.body + cellPadding * 2 + 5;

        checkNewPage(rowHeight * Math.min(element.children.length, 3) + 20);

        doc.fontSize(FONT_SIZES.small).font(getRegularFont());

        let tableY = doc.y;

        for (let rowIdx = 0; rowIdx < element.children.length; rowIdx++) {
          const row = element.children[rowIdx];
          if (!row.cells) continue;

          // Check for new page
          if (tableY + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            tableY = doc.page.margins.top;
          }

          // Draw row
          for (let colIdx = 0; colIdx < row.cells.length; colIdx++) {
            const cellX = doc.page.margins.left + colIdx * colWidth;
            const cellText = row.cells[colIdx] || '';

            // Draw cell border
            doc.rect(cellX, tableY, colWidth, rowHeight).stroke();

            // Draw cell text
            doc.text(cellText, cellX + cellPadding, tableY + cellPadding, {
              width: colWidth - cellPadding * 2,
              height: rowHeight - cellPadding * 2,
              ellipsis: true,
            });
          }

          tableY += rowHeight;
        }

        doc.y = tableY;
        doc.moveDown(0.5);
        break;
      }

      case 'hr': {
        checkNewPage(20);
        const y = doc.y + 5;
        doc
          .moveTo(doc.page.margins.left, y)
          .lineTo(doc.page.width - doc.page.margins.right, y)
          .stroke();
        doc.y = y + 10;
        break;
      }

      case 'break': {
        doc.moveDown(0.5);
        break;
      }
    }
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

// ═══════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════

/**
 * Convert DOCX buffer to PDF buffer locally
 * Full support: text, formatting, headings, lists, tables, images
 */
export async function convertDocxToPdfLocal(docxBuffer: Buffer): Promise<Buffer | null> {
  try {
    debugLog('DocxToPdf', `Converting DOCX (${(docxBuffer.length / 1024).toFixed(1)}KB)...`);

    // Step 1: Parse DOCX to HTML + extract images
    const { html, images, messages } = await parseDocxToHtml(docxBuffer);
    debugLog('DocxToPdf', `Parsed: ${html.length} chars HTML, ${images.size} images`);

    if (messages.length > 0) {
      debugLog('DocxToPdf', `Warnings: ${messages.slice(0, 3).join(', ')}`);
    }

    // Step 2: Parse HTML to elements
    const elements = parseHtmlToElements(html);
    debugLog('DocxToPdf', `Parsed ${elements.length} elements`);

    // Step 3: Render to PDF
    const pdfBuffer = await renderToPdf(elements, images);
    debugLog('DocxToPdf', `✓ Generated PDF: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);

    return pdfBuffer;
  } catch (e: any) {
    logError('DocxToPdf', e);
    return null;
  }
}

/**
 * Convert DOCX buffer to PDF base64 locally
 */
export async function convertDocxToPdfBase64Local(docxBuffer: Buffer): Promise<string | null> {
  const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);
  if (!pdfBuffer) return null;
  return pdfBuffer.toString('base64');
}
