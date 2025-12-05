/**
 * Content Builder - Chuyển đổi markdown blocks thành Word paragraphs
 */

import {
  BorderStyle,
  ExternalHyperlink,
  HeadingLevel,
  PageBreak,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';
import type { Block, InlineToken } from '../../../../../shared/utils/markdownParser.js';
import { hasStyle, parseMarkdown } from '../../../../../shared/utils/markdownParser.js';
import type { DocumentTheme, ExtendedBlock } from './types.js';
import { getTheme } from './themes.js';
import { CALLOUT_STYLES, HEADING_LEVELS } from './constants.js';
import { buildTable, parseMarkdownTable } from './tableBuilder.js';

// ═══════════════════════════════════════════════════
// INLINE TOKEN TO TEXT RUN
// ═══════════════════════════════════════════════════

export function tokensToTextRuns(
  tokens: InlineToken[],
  theme?: DocumentTheme
): (TextRun | ExternalHyperlink)[] {
  const t = theme || getTheme();

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
            color: t.colors.link,
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
      font: isCode ? t.fonts.code : t.fonts.body,
      shading: isCode ? { type: ShadingType.SOLID, color: t.colors.codeBackground } : undefined,
      color: t.colors.text,
    });
  });
}

// ═══════════════════════════════════════════════════
// BLOCK TO PARAGRAPH
// ═══════════════════════════════════════════════════

export function blockToParagraph(
  block: Block,
  theme?: DocumentTheme
): Paragraph | null {
  const t = theme || getTheme();

  switch (block.type) {
    case 'empty':
      return new Paragraph({ spacing: { after: t.spacing.paragraphAfter / 2 } });

    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4': {
      const headingLevel = HEADING_LEVELS[block.type as keyof typeof HEADING_LEVELS];
      return new Paragraph({
        heading: headingLevel,
        children: tokensToTextRuns(block.tokens, t) as TextRun[],
        spacing: { before: t.spacing.headingBefore, after: t.spacing.headingAfter },
      });
    }

    case 'bullet':
      return new Paragraph({
        bullet: { level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens, t) as TextRun[],
        spacing: { after: t.spacing.listItemAfter },
      });

    case 'numbered':
      return new Paragraph({
        numbering: { reference: 'default-numbering', level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens, t) as TextRun[],
        spacing: { after: t.spacing.listItemAfter },
      });

    case 'blockquote':
      return new Paragraph({
        children: tokensToTextRuns(block.tokens, t) as TextRun[],
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: t.colors.secondary } },
        spacing: { after: 120 },
        shading: { type: ShadingType.SOLID, color: 'F8F9FA' },
      });

    case 'codeBlock':
      return buildCodeBlock(block.raw || '', block.language, t);

    case 'hr':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: t.colors.tableBorder } },
        spacing: { before: 200, after: 200 },
      });

    default:
      return new Paragraph({
        children: tokensToTextRuns(block.tokens, t) as TextRun[],
        spacing: { after: t.spacing.paragraphAfter, line: t.spacing.lineSpacing },
      });
  }
}

// ═══════════════════════════════════════════════════
// SPECIAL BLOCKS
// ═══════════════════════════════════════════════════

export function buildCodeBlock(
  code: string,
  language?: string,
  theme?: DocumentTheme
): Paragraph {
  const t = theme || getTheme();
  const lines = code.split('\n');

  return new Paragraph({
    children: lines.flatMap((line, i) => [
      new TextRun({
        text: line,
        font: t.fonts.code,
        size: 20,
        color: t.colors.text,
      }),
      ...(i < lines.length - 1 ? [new TextRun({ break: 1 })] : []),
    ]),
    shading: { type: ShadingType.SOLID, color: t.colors.codeBackground },
    spacing: { before: 120, after: 120 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 1, color: t.colors.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: t.colors.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 1, color: t.colors.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 1, color: t.colors.tableBorder },
    },
  });
}

export function buildCallout(
  text: string,
  type: 'info' | 'warning' | 'success' | 'error',
  theme?: DocumentTheme
): Paragraph {
  const style = CALLOUT_STYLES[type];
  const t = theme || getTheme();

  return new Paragraph({
    children: [
      new TextRun({
        text: `${style.icon} `,
        size: 24,
      }),
      new TextRun({
        text,
        font: t.fonts.body,
        color: style.textColor,
      }),
    ],
    shading: { type: ShadingType.SOLID, color: style.backgroundColor },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: style.borderColor },
    },
    spacing: { before: 120, after: 120 },
    indent: { left: 200, right: 200 },
  });
}

export function buildPageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

// ═══════════════════════════════════════════════════
// CONTENT PARSER (Extended)
// ═══════════════════════════════════════════════════

/**
 * Parse content với hỗ trợ extended syntax
 * - [!INFO], [!WARNING], [!SUCCESS], [!ERROR] cho callouts
 * - [!TIP], [!NOTE], [!IMPORTANT] aliases
 * - [PAGE_BREAK] cho page break
 * - Markdown tables
 * - Horizontal rules (---, ***, ___)
 * - Centered text: ->text<-
 * - Right-aligned text: ->text
 */
export function parseExtendedContent(
  content: string,
  theme?: DocumentTheme
): (Paragraph | ReturnType<typeof buildTable>)[] {
  const t = theme || getTheme();
  const result: (Paragraph | ReturnType<typeof buildTable>)[] = [];
  
  // Normalize content
  const normalizedContent = content.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\r\n');
  const lines = normalizedContent.split('\n');
  
  let i = 0;
  let tableBuffer: string[] = [];
  let inTable = false;
  let codeBlockBuffer: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const tableData = parseMarkdownTable(tableBuffer.join('\n'));
      if (tableData) {
        result.push(buildTable(tableData, t));
      }
      tableBuffer = [];
    }
    inTable = false;
  };

  const flushCodeBlock = () => {
    if (codeBlockBuffer.length > 0) {
      result.push(buildCodeBlock(codeBlockBuffer.join('\n'), codeBlockLang, t));
      codeBlockBuffer = [];
    }
    inCodeBlock = false;
    codeBlockLang = '';
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block handling
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      i++;
      continue;
    }

    // Check for table start/continuation
    if (trimmed.includes('|') && !trimmed.startsWith('```')) {
      inTable = true;
      tableBuffer.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Page break
    if (trimmed === '[PAGE_BREAK]' || trimmed === '---PAGE---') {
      result.push(buildPageBreak());
      i++;
      continue;
    }

    // Callouts (extended with aliases)
    const calloutMatch = trimmed.match(/^\[!(INFO|WARNING|SUCCESS|ERROR|TIP|NOTE|IMPORTANT)\]\s*(.+)$/i);
    if (calloutMatch) {
      const typeMap: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
        info: 'info',
        tip: 'info',
        note: 'info',
        warning: 'warning',
        important: 'warning',
        success: 'success',
        error: 'error',
      };
      const calloutType = typeMap[calloutMatch[1].toLowerCase()] || 'info';
      result.push(buildCallout(calloutMatch[2], calloutType, t));
      i++;
      continue;
    }

    // Centered text: ->text<-
    const centeredMatch = trimmed.match(/^->(.+)<-$/);
    if (centeredMatch) {
      result.push(buildAlignedParagraph(centeredMatch[1].trim(), 'center', t));
      i++;
      continue;
    }

    // Right-aligned text: ->text
    const rightMatch = trimmed.match(/^->(.+)$/);
    if (rightMatch && !trimmed.endsWith('<-')) {
      result.push(buildAlignedParagraph(rightMatch[1].trim(), 'right', t));
      i++;
      continue;
    }

    // Regular markdown parsing for this line
    const blocks = parseMarkdown(line);
    for (const block of blocks) {
      const para = blockToParagraph(block, t);
      if (para) result.push(para);
    }
    i++;
  }

  // Flush remaining buffers
  flushTable();
  flushCodeBlock();

  return result;
}

/**
 * Build aligned paragraph
 */
export function buildAlignedParagraph(
  text: string,
  alignment: 'left' | 'center' | 'right',
  theme?: DocumentTheme
): Paragraph {
  const t = theme || getTheme();
  const tokens = parseMarkdown(text)[0]?.tokens || [{ text, styles: [] }];
  
  const alignmentMap = {
    left: 'left' as const,
    center: 'center' as const,
    right: 'right' as const,
  };

  return new Paragraph({
    alignment: alignmentMap[alignment],
    children: tokensToTextRuns(tokens, t) as TextRun[],
    spacing: { after: t.spacing.paragraphAfter },
  });
}
