/**
 * Content Builder - Chuyển đổi markdown blocks thành Word paragraphs
 * Tích hợp TẤT CẢ tính năng của Word framework
 */

import {
  BorderStyle,
  ExternalHyperlink,
  Paragraph,
  ShadingType,
  Table,
  TextRun,
} from 'docx';
import type { Block, InlineToken } from '../../../../../shared/utils/markdownParser.js';
import { hasStyle, parseMarkdown } from '../../../../../shared/utils/markdownParser.js';
import type { DocumentTheme } from './types.js';
import { getTheme } from './themes.js';
import { CALLOUT_STYLES, HEADING_LEVELS } from './constants.js';
import { buildTable, parseMarkdownTable } from './tableBuilder.js';
import { buildBox, parseBoxSyntax, hasBoxSyntax } from './boxBuilder.js';
import { buildDivider, buildDecoratedDivider, buildOrnamentDivider, parseDividerSyntax } from './dividerBuilder.js';
import { buildBadgeParagraph, parseBadges, hasBadges, removeBadgeSyntax } from './badgeBuilder.js';
import { buildMathParagraph, hasMathExpression, renderMathExpression } from './mathBuilder.js';
import { buildHighlightedParagraph, hasHighlights } from './highlightBuilder.js';
import { replaceEmojiShortcuts, parseIconSyntax, buildIconParagraph } from './emojiBuilder.js';
import { buildSignatureBlock, buildApprovalBlock, parseSignatureSyntax, parseApprovalSyntax, isSignatureSyntax } from './signatureBuilder.js';
import { buildCoverPage, parseCoverPageSyntax, hasCoverPageSyntax, removeCoverPageSyntax } from './coverPageBuilder.js';
import { buildChecklist, parseChecklist, buildDefinitionList, parseDefinitionList } from './listBuilder.js';
import { buildImageParagraph, parseImageSyntax } from './imageBuilder.js';
import { parseFootnotes } from './footnoteBuilder.js';
import { PageBreak } from 'docx';

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

    // Process emoji shortcuts in text
    const processedText = replaceEmojiShortcuts(token.text);

    if (isLink && token.href) {
      return new ExternalHyperlink({
        children: [
          new TextRun({
            text: processedText,
            style: 'Hyperlink',
            color: t.colors.link,
            underline: { type: 'single' },
          }),
        ],
        link: token.href,
      });
    }

    return new TextRun({
      text: processedText,
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

export function buildCallout(
  text: string,
  type: 'info' | 'warning' | 'success' | 'error',
  theme?: DocumentTheme
): Paragraph {
  const style = CALLOUT_STYLES[type];
  const t = theme || getTheme();

  return new Paragraph({
    children: [
      new TextRun({ text: `${style.icon} `, size: 24 }),
      new TextRun({ text: replaceEmojiShortcuts(text), font: t.fonts.body, color: style.textColor }),
    ],
    shading: { type: ShadingType.SOLID, color: style.backgroundColor },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: style.borderColor } },
    spacing: { before: 120, after: 120 },
    indent: { left: 200, right: 200 },
  });
}

export function buildPageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

export function buildAlignedParagraph(
  text: string,
  alignment: 'left' | 'center' | 'right',
  theme?: DocumentTheme
): Paragraph {
  const t = theme || getTheme();
  const processedText = replaceEmojiShortcuts(text);
  const tokens = parseMarkdown(processedText)[0]?.tokens || [{ text: processedText, styles: [] }];

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
  theme?: DocumentTheme
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

  // 2. Process BOX blocks first (multi-line)
  if (hasBoxSyntax(normalizedContent)) {
    const { segments } = parseBoxSyntax(normalizedContent);
    for (const segment of segments) {
      if (segment.type === 'text' && segment.content) {
        result.push(...parseLines(segment.content, t));
      } else if (segment.type === 'box' && segment.config) {
        result.push(...buildBox(segment.config, t));
      }
    }
    return result;
  }

  // 3. Process line by line
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
  let checklistBuffer: string[] = [];

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

  const flushChecklist = () => {
    if (checklistBuffer.length > 0) {
      const items = parseChecklist(checklistBuffer.join('\n'));
      result.push(...buildChecklist(items, theme));
      checklistBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block handling
    if (trimmed.startsWith('```')) {
      flushChecklist();
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
      flushChecklist();
      inTable = true;
      tableBuffer.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Checklist: - [ ] or - [x]
    if (/^(\s*)[-*]\s*\[([ xX])\]/.test(line)) {
      checklistBuffer.push(line);
      i++;
      continue;
    } else {
      flushChecklist();
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
        result.push(buildDecoratedDivider((dividerConfig as { decorated: true; text: string }).text, theme));
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

    // Icon
    const iconConfig = parseIconSyntax(trimmed);
    if (iconConfig) {
      result.push(buildIconParagraph(iconConfig.emoji, iconConfig.size, theme));
      i++;
      continue;
    }

    // Signature
    const sigConfig = parseSignatureSyntax(trimmed);
    if (sigConfig) {
      result.push(...buildSignatureBlock(sigConfig, theme));
      i++;
      continue;
    }

    // Approval block
    const approvalConfig = parseApprovalSyntax(trimmed);
    if (approvalConfig) {
      result.push(...buildApprovalBlock(approvalConfig.approver, approvalConfig.creator, theme));
      i++;
      continue;
    }

    // Callouts
    const calloutMatch = trimmed.match(/^\[!(INFO|WARNING|SUCCESS|ERROR|TIP|NOTE|IMPORTANT)\]\s*(.+)$/i);
    if (calloutMatch) {
      const typeMap: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
        info: 'info', tip: 'info', note: 'info',
        warning: 'warning', important: 'warning',
        success: 'success', error: 'error',
      };
      result.push(buildCallout(calloutMatch[2], typeMap[calloutMatch[1].toLowerCase()] || 'info', theme));
      i++;
      continue;
    }

    // Badges
    if (hasBadges(trimmed)) {
      const badges = parseBadges(trimmed);
      const remainingText = removeBadgeSyntax(trimmed);
      if (badges.length > 0) {
        result.push(buildBadgeParagraph(badges, theme));
      }
      if (remainingText) {
        const blocks = parseMarkdown(remainingText);
        for (const block of blocks) {
          const para = blockToParagraph(block, theme);
          if (para) result.push(para);
        }
      }
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
    const processedLine = replaceEmojiShortcuts(line);
    const blocks = parseMarkdown(processedLine);
    for (const block of blocks) {
      const para = blockToParagraph(block, theme);
      if (para) result.push(para);
    }
    i++;
  }

  // Flush remaining buffers
  flushTable();
  flushCodeBlock();
  flushChecklist();

  return result;
}
