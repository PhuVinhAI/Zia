/**
 * DOC/DOCX to PDF Service - Convert DOC/DOCX to PDF locally
 * - DOCX: mammoth + pdfkit + sharp
 * - DOC: officeparser (text) + cfb (images) + pdfkit + sharp
 * Full support: text formatting, headings, lists, tables, images
 * Sử dụng font Roboto hỗ trợ tiếng Việt
 * Không cần API key, không cần LibreOffice
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import CFB from 'cfb';
import mammoth from 'mammoth';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
// @ts-ignore - no types available
import WordExtractor from 'word-extractor';
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
// FILE FORMAT DETECTION
// ═══════════════════════════════════════════════════

/**
 * Check if buffer is a DOC file (Word 97-2003 format)
 * DOC files start with D0 CF 11 E0 (OLE Compound Document)
 */
function isDocFormat(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  return (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

/**
 * Check if buffer is a DOCX file (Office Open XML format)
 * DOCX files are ZIP archives starting with PK (50 4B)
 */
function isDocxFormat(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

// ═══════════════════════════════════════════════════
// DOC PARSING (Word 97-2003) using CFB
// ═══════════════════════════════════════════════════

interface DocParseResult {
  elements: ParsedElement[];
  images: Map<string, ExtractedImage>;
}

/**
 * Extract text from WordDocument stream
 * DOC files store text in a complex binary format
 */
function extractTextFromWordDocument(data: Uint8Array): string {
  // Try to extract readable text from the binary data
  // DOC format stores text as UTF-16LE or ASCII depending on version
  const text: string[] = [];
  let i = 0;
  
  while (i < data.length - 1) {
    // Try UTF-16LE first (common in newer DOC files)
    const charCode = data[i] | (data[i + 1] << 8);
    
    // Check if it's a printable character or common whitespace
    if ((charCode >= 32 && charCode < 127) || charCode === 10 || charCode === 13 || charCode === 9) {
      text.push(String.fromCharCode(charCode));
      i += 2;
    } else if (data[i] >= 32 && data[i] < 127) {
      // Fallback to ASCII
      text.push(String.fromCharCode(data[i]));
      i += 1;
    } else {
      i += 1;
    }
  }
  
  return text.join('');
}

/**
 * Convert CFB blob to Uint8Array
 */
function toUint8Array(blob: number[] | Uint8Array): Uint8Array {
  if (blob instanceof Uint8Array) return blob;
  return new Uint8Array(blob);
}

/**
 * Detect image format from buffer header
 */
function detectImageFormat(buffer: number[] | Uint8Array): string | null {
  if (buffer.length < 8) return null;
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)) {
    return 'image/tiff';
  }
  // WMF: D7 CD C6 9A
  if (buffer[0] === 0xd7 && buffer[1] === 0xcd && buffer[2] === 0xc6 && buffer[3] === 0x9a) {
    return 'image/wmf';
  }
  // EMF: 01 00 00 00
  if (buffer[0] === 0x01 && buffer[1] === 0x00 && buffer[2] === 0x00 && buffer[3] === 0x00) {
    return 'image/emf';
  }
  
  return null;
}

/**
 * Extract images from DOC file using CFB
 * Images in DOC are stored in the Data stream or as OLE objects
 */
async function extractImagesFromDoc(cfbFile: CFB.CFB$Container): Promise<Map<string, ExtractedImage>> {
  const images = new Map<string, ExtractedImage>();
  let imageIndex = 0;
  
  // Look for image data in various streams
  const streamNames = ['Data', 'Pictures', '1Table', '0Table', 'ObjectPool'];
  
  for (const entry of cfbFile.FileIndex) {
    if (entry.type !== 2) continue; // Only process stream entries
    
    const name = entry.name;
    const content = entry.content;
    
    if (!content || content.length < 8) continue;
    
    // Convert to Uint8Array for consistent handling
    const contentArray = toUint8Array(content);
    
    // Check if this stream contains image data
    const format = detectImageFormat(contentArray);
    if (format) {
      const imageId = `doc_img_${imageIndex++}`;
      let processedBuffer = Buffer.from(contentArray) as Buffer;
      let width: number | undefined;
      let height: number | undefined;
      
      try {
        const metadata = await sharp(processedBuffer).metadata();
        width = metadata.width;
        height = metadata.height;
        
        // Convert to PNG if needed
        if (format !== 'image/png' && format !== 'image/jpeg') {
          processedBuffer = await sharp(processedBuffer).png().toBuffer();
        }
      } catch {
        // Keep original if sharp fails
      }
      
      images.set(imageId, {
        id: imageId,
        contentType: format,
        buffer: processedBuffer,
        width,
        height,
      });
      
      debugLog('DocxToPdf', `Found image in DOC: ${name} (${format})`);
    }
    
    // Also scan for embedded images within streams
    if (streamNames.some(s => name.includes(s)) || name === 'WordDocument') {
      // Scan for image signatures within the stream
      for (let offset = 0; offset < contentArray.length - 100; offset++) {
        const slice = contentArray.slice(offset, offset + 8);
        const format = detectImageFormat(slice);
        
        if (format) {
          // Try to find the end of the image
          let endOffset = offset + 100;
          
          // For JPEG, look for FFD9 end marker
          if (format === 'image/jpeg') {
            for (let j = offset + 2; j < contentArray.length - 1; j++) {
              if (contentArray[j] === 0xff && contentArray[j + 1] === 0xd9) {
                endOffset = j + 2;
                break;
              }
            }
          }
          // For PNG, look for IEND chunk
          else if (format === 'image/png') {
            for (let j = offset; j < contentArray.length - 8; j++) {
              if (contentArray[j] === 0x49 && contentArray[j + 1] === 0x45 && 
                  contentArray[j + 2] === 0x4e && contentArray[j + 3] === 0x44) {
                endOffset = j + 12; // IEND + CRC
                break;
              }
            }
          }
          
          if (endOffset > offset + 100 && endOffset <= contentArray.length) {
            const imageData = contentArray.slice(offset, endOffset);
            const imageId = `doc_img_${imageIndex++}`;
            let processedBuffer = Buffer.from(imageData) as Buffer;
            let width: number | undefined;
            let height: number | undefined;
            
            try {
              const metadata = await sharp(processedBuffer).metadata();
              width = metadata.width;
              height = metadata.height;
              
              if (width && height && width > 10 && height > 10) {
                if (format !== 'image/png' && format !== 'image/jpeg') {
                  processedBuffer = await sharp(processedBuffer).png().toBuffer();
                }
                
                images.set(imageId, {
                  id: imageId,
                  contentType: format,
                  buffer: processedBuffer,
                  width,
                  height,
                });
                
                debugLog('DocxToPdf', `Extracted embedded image: ${imageId} (${width}x${height})`);
              }
            } catch {
              // Invalid image data, skip
            }
            
            offset = endOffset - 1; // Skip past this image
          }
        }
      }
    }
  }
  
  return images;
}

/**
 * Parse DOC file using word-extractor (text) + CFB (images)
 * word-extractor handles Vietnamese text correctly
 */
async function parseDocFile(docBuffer: Buffer): Promise<DocParseResult> {
  const elements: ParsedElement[] = [];
  
  // Parse the OLE compound document for images
  const cfbFile = CFB.read(docBuffer, { type: 'buffer' });
  
  // Extract images from CFB
  const images = await extractImagesFromDoc(cfbFile);
  
  // Use word-extractor to extract text with proper encoding (supports Vietnamese)
  let textContent = '';
  
  try {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(docBuffer);
    textContent = doc.getBody() || '';
  } catch (err) {
    debugLog('DocxToPdf', `word-extractor failed: ${err}, falling back to CFB`);
    // Fallback to CFB text extraction
    const wordDocEntry = CFB.find(cfbFile, 'WordDocument');
    if (wordDocEntry?.content) {
      textContent = extractTextFromWordDocument(toUint8Array(wordDocEntry.content));
    }
  }
  
  // Clean up the extracted text
  textContent = textContent
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters except newlines/tabs
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
  
  // Parse text into elements
  const paragraphs = textContent.split(/\n\n+/).filter((p: string) => p.trim());
  const imageIds = Array.from(images.keys());
  
  // Process all text paragraphs first
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) continue;
      
      // Heuristics for headings (short lines, possibly with numbers like "1.", "2.")
      const isHeading =
        lineTrimmed.length < 100 &&
        ((lineTrimmed === lineTrimmed.toUpperCase() && /[A-ZÀ-Ỹ]/.test(lineTrimmed)) ||
          /^(Chương|CHƯƠNG|Phần|PHẦN|Mục|MỤC|Bài|BÀI)\s+\d/i.test(lineTrimmed) ||
          /^\d+\.\s+[A-ZÀ-Ỹ]/.test(lineTrimmed));
      
      if (isHeading) {
        elements.push({ type: 'heading', content: lineTrimmed, level: 2, bold: true });
      } else if (
        lineTrimmed.startsWith('•') ||
        lineTrimmed.startsWith('-') ||
        lineTrimmed.startsWith('*') ||
        /^\d+\)/.test(lineTrimmed)
      ) {
        const content = lineTrimmed.replace(/^[•\-*]|\d+\)\s*/, '').trim();
        elements.push({ type: 'list-item', content });
      } else {
        elements.push({ type: 'paragraph', content: lineTrimmed });
      }
    }
  }
  
  // Add all images at the end as appendix (since DOC format doesn't preserve image positions)
  if (imageIds.length > 0) {
    elements.push({ type: 'hr' });
    elements.push({ type: 'heading', content: 'PHỤ LỤC HÌNH ẢNH', level: 1, bold: true });
    elements.push({
      type: 'paragraph',
      content: `(Tài liệu gốc chứa ${imageIds.length} hình ảnh - vị trí gốc không thể xác định từ định dạng DOC)`,
    });
    
    for (let i = 0; i < imageIds.length; i++) {
      elements.push({ type: 'paragraph', content: `Hình ${i + 1}:`, bold: true });
      elements.push({ type: 'image', imageId: imageIds[i] });
    }
  }
  
  debugLog('DocxToPdf', `DOC parsed: ${elements.length} elements, ${images.size} images`);
  
  return { elements, images };
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
 * Convert DOC/DOCX buffer to PDF buffer locally
 * Automatically detects file format (DOC vs DOCX)
 * - DOCX: Full support for text, formatting, headings, lists, tables, images
 * - DOC: Text extraction with basic formatting (images not supported in DOC)
 */
export async function convertDocxToPdfLocal(buffer: Buffer): Promise<Buffer | null> {
  try {
    const sizeKB = (buffer.length / 1024).toFixed(1);
    
    // Detect file format
    if (isDocFormat(buffer)) {
      // Handle DOC (Word 97-2003)
      debugLog('DocxToPdf', `Converting DOC (${sizeKB}KB)...`);
      
      const { elements, images } = await parseDocFile(buffer);
      debugLog('DocxToPdf', `Parsed ${elements.length} elements, ${images.size} images from DOC`);
      
      if (elements.length === 0) {
        debugLog('DocxToPdf', '⚠ No content extracted from DOC file');
        return null;
      }
      
      // Render to PDF with images
      const pdfBuffer = await renderToPdf(elements, images);
      debugLog('DocxToPdf', `✓ Generated PDF from DOC: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);
      
      return pdfBuffer;
    }
    
    if (isDocxFormat(buffer)) {
      // Handle DOCX (Office Open XML)
      debugLog('DocxToPdf', `Converting DOCX (${sizeKB}KB)...`);
      
      const { html, images, messages } = await parseDocxToHtml(buffer);
      debugLog('DocxToPdf', `Parsed: ${html.length} chars HTML, ${images.size} images`);
      
      if (messages.length > 0) {
        debugLog('DocxToPdf', `Warnings: ${messages.slice(0, 3).join(', ')}`);
      }
      
      const elements = parseHtmlToElements(html);
      debugLog('DocxToPdf', `Parsed ${elements.length} elements`);
      
      const pdfBuffer = await renderToPdf(elements, images);
      debugLog('DocxToPdf', `✓ Generated PDF from DOCX: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);
      
      return pdfBuffer;
    }
    
    // Unknown format - try as DOCX anyway (fallback)
    debugLog('DocxToPdf', `Unknown format, trying as DOCX (${sizeKB}KB)...`);
    
    const { html, images, messages } = await parseDocxToHtml(buffer);
    const elements = parseHtmlToElements(html);
    const pdfBuffer = await renderToPdf(elements, images);
    
    debugLog('DocxToPdf', `✓ Generated PDF: ${(pdfBuffer.length / 1024).toFixed(1)}KB`);
    return pdfBuffer;
    
  } catch (e: any) {
    logError('DocxToPdf', e);
    return null;
  }
}

/**
 * Convert DOC/DOCX buffer to PDF base64 locally
 */
export async function convertDocxToPdfBase64Local(buffer: Buffer): Promise<string | null> {
  const pdfBuffer = await convertDocxToPdfLocal(buffer);
  if (!pdfBuffer) return null;
  return pdfBuffer.toString('base64');
}
