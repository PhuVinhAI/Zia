/**
 * Content Parser - Parse markdown content thành slides
 */

import { SLIDE_SEPARATORS } from './constants.js';
import type {
  ParsedBullet,
  ParsedImage,
  ParsedSlide,
  ParsedTable,
  PresentationOptions,
  SlideType,
} from './types.js';

// ═══════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════

export function parseContent(content: string): ParsedSlide[] {
  const slideTexts = splitIntoSlides(content);
  return slideTexts.map((text, index) => parseSlide(text, index));
}

export function splitIntoSlides(content: string): string[] {
  // Try each separator pattern
  for (const separator of SLIDE_SEPARATORS) {
    const parts = content
      .split(separator)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 1) return parts;
  }

  // Fallback: split by double newline + heading
  const headingSplit = content.split(/\n(?=# )/);
  if (headingSplit.length > 1) {
    return headingSplit.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // No split found, return as single slide
  return [content.trim()];
}

// ═══════════════════════════════════════════════════
// SLIDE PARSER
// ═══════════════════════════════════════════════════

export function parseSlide(text: string, index: number): ParsedSlide {
  const lines = text.split('\n');
  const slide: ParsedSlide = {
    type: 'content',
    bullets: [],
    numberedItems: [],
    codeBlocks: [],
    images: [],
  };

  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';
  let inTable = false;
  let tableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block handling
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        slide.codeBlocks.push({ code: codeBlockContent.trim(), language: codeBlockLang });
        inCodeBlock = false;
        codeBlockContent = '';
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += `${line}\n`;
      continue;
    }

    // Table handling
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      slide.table = parseTable(tableLines);
      inTable = false;
      tableLines = [];
    }

    // Slide type directives
    const typeMatch = trimmed.match(/^\[SLIDE:(\w+)\]$/i);
    if (typeMatch) {
      slide.type = typeMatch[1].toLowerCase() as SlideType;
      continue;
    }

    // Quote
    const quoteMatch = trimmed.match(/^\[QUOTE:([^:]+)(?::([^\]]+))?\]$/i);
    if (quoteMatch) {
      slide.quote = { text: quoteMatch[1], author: quoteMatch[2] };
      slide.type = 'quote';
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      slide.title = trimmed.slice(2).trim();
      if (index === 0 && !slide.subtitle) slide.type = 'title';
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (!slide.title) {
        slide.title = trimmed.slice(3).trim();
      } else if (!slide.subtitle) {
        slide.subtitle = trimmed.slice(3).trim();
      } else {
        slide.bullets.push({ text: trimmed.slice(3).trim(), level: 0, styles: ['bold'] });
      }
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (!slide.title) {
        slide.title = trimmed.slice(4).trim();
      } else {
        slide.bullets.push({ text: trimmed.slice(4).trim(), level: 0, styles: ['bold'] });
      }
      continue;
    }

    // Bullets
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      const level = Math.floor(indent / 2);
      const text = bulletMatch[2].trim();
      const styles = extractTextStyles(text);

      // Check for checkbox
      const checkMatch = text.match(/^\[([ x])\]\s*(.+)$/i);
      if (checkMatch) {
        slide.bullets.push({
          text: checkMatch[2],
          level,
          checked: checkMatch[1].toLowerCase() === 'x',
          styles,
        });
      } else {
        slide.bullets.push({ text: cleanText(text), level, styles });
      }
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numMatch) {
      slide.numberedItems.push(cleanText(numMatch[2].trim()));
      continue;
    }

    // Images
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      slide.images.push(parseImage(imgMatch[1], imgMatch[2]));
      continue;
    }

    // Extended image syntax
    const extImgMatch = trimmed.match(/^\[IMAGE:([^\]]+)\]$/i);
    if (extImgMatch) {
      slide.images.push(parseExtendedImage(extImgMatch[1]));
      continue;
    }

    // Blockquote as quote
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.slice(2).trim();
      if (!slide.quote) {
        slide.quote = { text: quoteText };
      } else {
        slide.quote.text += `\n${quoteText}`;
      }
      continue;
    }

    // Plain text as bullet
    if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('<!--')) {
      slide.bullets.push({ text: cleanText(trimmed), level: 0, styles: [] });
    }
  }

  // Handle remaining table
  if (inTable && tableLines.length > 0) {
    slide.table = parseTable(tableLines);
  }

  // Determine slide type if not set
  if (slide.type === 'content') {
    if (index === 0 && slide.title && !slide.bullets.length && !slide.table) {
      slide.type = 'title';
    } else if (slide.quote) {
      slide.type = 'quote';
    } else if (slide.images.length > 0 && !slide.bullets.length) {
      slide.type = 'imageOnly';
    }
  }

  return slide;
}

// ═══════════════════════════════════════════════════
// HELPER PARSERS
// ═══════════════════════════════════════════════════

function parseTable(lines: string[]): ParsedTable {
  const rows = lines
    .filter((line) => !line.match(/^\|[\s-:|]+\|$/)) // Remove separator line
    .map((line) =>
      line
        .split('|')
        .slice(1, -1) // Remove empty first/last from split
        .map((cell) => cell.trim()),
    );

  return {
    headers: rows[0] || [],
    rows: rows.slice(1),
  };
}

function parseImage(alt: string, src: string): ParsedImage {
  const captionMatch = src.match(/^(.+?)\s+"([^"]+)"$/);
  if (captionMatch) {
    return { src: captionMatch[1], alt, caption: captionMatch[2] };
  }
  return { src, alt };
}

function parseExtendedImage(params: string): ParsedImage {
  const parts = params.split(',').map((p) => p.trim());
  const image: ParsedImage = { src: parts[0] };

  for (const part of parts.slice(1)) {
    const [key, value] = part.split('=').map((s) => s.trim());
    switch (key) {
      case 'width':
        image.width = parseInt(value, 10);
        break;
      case 'height':
        image.height = parseInt(value, 10);
        break;
      case 'caption':
        image.caption = value.replace(/^["']|["']$/g, '');
        break;
      case 'alt':
        image.alt = value.replace(/^["']|["']$/g, '');
        break;
    }
  }

  return image;
}

function extractTextStyles(text: string): ParsedBullet['styles'] {
  const styles: ParsedBullet['styles'] = [];
  if (/\*\*[^*]+\*\*/.test(text) || /__[^_]+__/.test(text)) styles.push('bold');
  if (/\*[^*]+\*/.test(text) || /_[^_]+_/.test(text)) styles.push('italic');
  if (/~~[^~]+~~/.test(text)) styles.push('strikethrough');
  if (/`[^`]+`/.test(text)) styles.push('code');
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) styles.push('link');
  return styles;
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

// ═══════════════════════════════════════════════════
// OPTIONS PARSER
// ═══════════════════════════════════════════════════

export function parseOptions(content: string): {
  options: Partial<PresentationOptions>;
  cleanContent: string;
} {
  const optionsMatch = content.match(/<!--\s*OPTIONS:\s*(\{[\s\S]*?\})\s*-->/);

  if (!optionsMatch) {
    return { options: {}, cleanContent: content };
  }

  try {
    const options = JSON.parse(optionsMatch[1]) as Partial<PresentationOptions>;
    const cleanContent = content.replace(optionsMatch[0], '').trim();
    return { options, cleanContent };
  } catch {
    return { options: {}, cleanContent: content };
  }
}
