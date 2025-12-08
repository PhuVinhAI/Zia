/**
 * Content Builder - Chuyển đổi markdown blocks thành Word paragraphs
 * Tích hợp TẤT CẢ tính năng của Word framework
 */

import {
  BorderStyle,
  ExternalHyperlink,
  FootnoteReferenceRun,
  PageBreak,
  Paragraph,
  ShadingType,
  type Table,
  TextRun,
} from 'docx';
import type { Block, InlineToken } from '../../shared/utils/markdown/markdownParser.js';
import { hasStyle, parseMarkdown } from '../../shared/utils/markdown/markdownParser.js';
import { HEADING_LEVELS } from './constants.js';
import {
  buildCoverPage,
  hasCoverPageSyntax,
  parseCoverPageSyntax,
  removeCoverPageSyntax,
} from './coverPageBuilder.js';
import {
  buildDecoratedDivider,
  buildDivider,
  buildOrnamentDivider,
  parseDividerSyntax,
} from './dividerBuilder.js';
import { hasFootnoteReference } from './footnoteBuilder.js';
import { buildHighlightedParagraph, hasHighlights } from './highlightBuilder.js';
import { buildImageParagraph, parseImageSyntax } from './imageBuilder.js';
import { buildDefinitionList, parseDefinitionList } from './listBuilder.js';
import { buildMathParagraph, hasMathExpression } from './mathBuilder.js';
import { buildTable, parseMarkdownTable } from './tableBuilder.js';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// INLINE TOKEN TO TEXT RUN
// ═══════════════════════════════════════════════════

export function tokensToTextRuns(
  tokens: InlineToken[],
  theme?: DocumentTheme,
): (TextRun | ExternalHyperlink | FootnoteReferenceRun)[] {
  const t = theme || getTheme();
  const result: (TextRun | ExternalHyperlink | FootnoteReferenceRun)[] = [];

  for (const token of tokens) {
    const isBold = hasStyle(token, 'bold') || hasStyle(token, 'boldItalic');
    const isItalic = hasStyle(token, 'italic') || hasStyle(token, 'boldItalic');
    const isStrike = hasStyle(token, 'strikethrough');
    const isCode = hasStyle(token, 'code');
    const isLink = hasStyle(token, 'link');

    // Check for footnote references in text
    if (hasFootnoteReference(token.text)) {
      const parts = token.text.split(/(\[\^\d+\])/g);
      for (const part of parts) {
        const fnMatch = part.match(/\[\^(\d+)\]/);
        if (fnMatch) {
          result.push(new FootnoteReferenceRun(parseInt(fnMatch[1], 10)));
        } else if (part) {
          result.push(
            new TextRun({
              text: part,
              bold: isBold,
              italics: isItalic,
              strike: isStrike,
              font: isCode ? t.fonts.code : t.fonts.body,
              shading: isCode
                ? { type: ShadingType.SOLID, color: t.colors.codeBackground }
                : undefined,
              color: t.colors.text,
            }),
          );
        }
      }
      continue;
    }

    if (isLink && token.href) {
      result.push(
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: token.text,
              style: 'Hyperlink',
              color: t.colors.link,
              underline: { type: 'single' },
            }),
          ],
          link: token.href,
        }),
      );
      continue;
    }

    result.push(
      new TextRun({
        text: token.text,
        bold: isBold,
        italics: isItalic,
        strike: isStrike,
        font: isCode ? t.fonts.code : t.fonts.body,
        shading: isCode ? { type: ShadingType.SOLID, color: t.colors.codeBackground } : undefined,
        color: t.colors.text,
      }),
    );
  }

  return result;
}

// ═══════════════════════════════════════════════════
// BLOCK TO PARAGRAPH
// ═══════════════════════════════════════════════════

export function blockToParagraph(block: Block, theme?: DocumentTheme): Paragraph | null {
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
      return buildCodeBlock(block.raw || '', t);

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

export function buildCodeBlock(code: string, theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();
  const lines = code.split('\n');

  return new Paragraph({
    children: lines.flatMap((line, i) => [
      new TextRun({ text: line, font: t.fonts.code, size: 20, color: t.colors.text }),
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

export function buildPageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

export function buildAlignedParagraph(
  text: string,
  alignment: 'left' | 'center' | 'right',
  theme?: DocumentTheme,
): Paragraph {
  const t = theme || getTheme();
  const tokens = parseMarkdown(text)[0]?.tokens || [{ text: text, styles: [] }];

  return new Paragraph({
    alignment: alignment,
    children: tokensToTextRuns(tokens, t) as TextRun[],
    spacing: { after: t.spacing.paragraphAfter },
  });
}

// ═══════════════════════════════════════════════════
// MAIN CONTENT PARSER - TẤT CẢ TÍNH NĂNG
// ═══════════════════════════════════════════════════

export function parseExtendedContent(
  content: string,
  theme?: DocumentTheme,
): (Paragraph | Table)[] {
  const t = theme || getTheme();
  const result: (Paragraph | Table)[] = [];

  // Normalize content
  let normalizedContent = content.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\r\n');

  // 1. Process Cover Page
  if (hasCoverPageSyntax(normalizedContent)) {
    const coverConfig = parseCoverPageSyntax(normalizedContent);
    if (coverConfig) {
      result.push(...buildCoverPage(coverConfig, t));
      normalizedContent = removeCoverPageSyntax(normalizedContent);
    }
  }

  // 2. Process line by line
  result.push(...parseLines(normalizedContent, t));

  return result;
}

function parseLines(content: string, theme: DocumentTheme): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const lines = content.split('\n');

  let i = 0;
  let tableBuffer: string[] = [];
  let inTable = false;
  let codeBlockBuffer: string[] = [];
  let inCodeBlock = false;
  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const tableData = parseMarkdownTable(tableBuffer.join('\n'));
      if (tableData) result.push(buildTable(tableData, theme));
      tableBuffer = [];
    }
    inTable = false;
  };

  const flushCodeBlock = () => {
    if (codeBlockBuffer.length > 0) {
      result.push(buildCodeBlock(codeBlockBuffer.join('\n'), theme));
      codeBlockBuffer = [];
    }
    inCodeBlock = false;
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
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      i++;
      continue;
    }

    // Table handling
    if (trimmed.includes('|') && !trimmed.startsWith('[')) {
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

    // Dividers
    const dividerConfig = parseDividerSyntax(trimmed);
    if (dividerConfig) {
      if ('decorated' in dividerConfig) {
        result.push(
          buildDecoratedDivider((dividerConfig as { decorated: true; text: string }).text, theme),
        );
      } else {
        result.push(buildDivider(dividerConfig, theme));
      }
      i++;
      continue;
    }

    // Ornament dividers
    if (trimmed === '[DIVIDER:star]') {
      result.push(buildOrnamentDivider('geometric', theme));
      i++;
      continue;
    }
    if (trimmed === '[DIVIDER:floral]') {
      result.push(buildOrnamentDivider('floral', theme));
      i++;
      continue;
    }

    // Math expressions
    if (hasMathExpression(trimmed)) {
      const isBlock = trimmed.startsWith('$$') && trimmed.endsWith('$$');
      const expr = isBlock ? trimmed.slice(2, -2) : trimmed.replace(/\$/g, '');
      result.push(buildMathParagraph(expr, isBlock, theme));
      i++;
      continue;
    }

    // Highlights
    if (hasHighlights(trimmed)) {
      result.push(buildHighlightedParagraph(trimmed, theme));
      i++;
      continue;
    }

    // Images: ![alt](url) or [IMAGE:...]
    const imageConfig = parseImageSyntax(trimmed);
    if (imageConfig) {
      try {
        result.push(...buildImageParagraph(imageConfig, theme));
      } catch {
        // Skip invalid images
      }
      i++;
      continue;
    }

    // Definition list: Term followed by : Definition
    if (i + 1 < lines.length && lines[i + 1]?.trim().startsWith(': ')) {
      const defItems = parseDefinitionList(`${line}\n${lines[i + 1]}`);
      if (defItems.length > 0) {
        result.push(...buildDefinitionList(defItems, theme));
        i += 2;
        continue;
      }
    }

    // Centered text: ->text<-
    const centeredMatch = trimmed.match(/^->(.+)<-$/);
    if (centeredMatch) {
      result.push(buildAlignedParagraph(centeredMatch[1].trim(), 'center', theme));
      i++;
      continue;
    }

    // Right-aligned text: ->text
    const rightMatch = trimmed.match(/^->(.+)$/);
    if (rightMatch && !trimmed.endsWith('<-')) {
      result.push(buildAlignedParagraph(rightMatch[1].trim(), 'right', theme));
      i++;
      continue;
    }

    // Regular markdown parsing
    const blocks = parseMarkdown(line);
    for (const block of blocks) {
      const para = blockToParagraph(block, theme);
      if (para) result.push(para);
    }
    i++;
  }

  // Flush remaining buffers
  flushTable();
  flushCodeBlock();

  return result;
}
