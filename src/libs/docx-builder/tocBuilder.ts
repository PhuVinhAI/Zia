/**
 * Table of Contents Builder - Tạo mục lục tự động
 */

import { AlignmentType, Paragraph, TableOfContents, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// TOC BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build Table of Contents
 */
export function buildTableOfContents(
  title?: string,
  theme?: DocumentTheme,
): (Paragraph | TableOfContents)[] {
  const t = theme || getTheme();
  const result: (Paragraph | TableOfContents)[] = [];

  // TOC Title
  if (title !== '') {
    result.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title || 'Mục Lục',
            bold: true,
            size: 36,
            font: t.fonts.heading,
            color: t.colors.heading,
          }),
        ],
        spacing: { before: 200, after: 300 },
      }),
    );
  }

  // TOC
  result.push(
    new TableOfContents('Mục Lục', {
      hyperlink: true,
      headingStyleRange: '1-4',
      stylesWithLevels: [
        { styleName: 'Heading1', level: 1 },
        { styleName: 'Heading2', level: 2 },
        { styleName: 'Heading3', level: 3 },
        { styleName: 'Heading4', level: 4 },
      ],
    }),
  );

  // Page break after TOC
  result.push(
    new Paragraph({
      pageBreakBefore: true,
    }),
  );

  return result;
}

/**
 * Build simple manual TOC từ headings
 */
export function buildManualTOC(
  headings: { level: number; text: string }[],
  title?: string,
  theme?: DocumentTheme,
): Paragraph[] {
  const t = theme || getTheme();
  const result: Paragraph[] = [];

  // TOC Title
  result.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: title || 'Mục Lục',
          bold: true,
          size: 36,
          font: t.fonts.heading,
          color: t.colors.heading,
        }),
      ],
      spacing: { before: 200, after: 300 },
    }),
  );

  // TOC entries
  for (const heading of headings) {
    const indent = (heading.level - 1) * 360; // 0.25 inch per level
    const fontSize = 24 - (heading.level - 1) * 2; // Smaller for deeper levels

    result.push(
      new Paragraph({
        children: [
          new TextRun({
            text: heading.text,
            size: fontSize,
            font: t.fonts.body,
            color: t.colors.text,
          }),
        ],
        indent: { left: indent },
        spacing: { after: 80 },
      }),
    );
  }

  // Spacing after TOC
  result.push(
    new Paragraph({
      spacing: { after: 400 },
    }),
  );

  return result;
}

/**
 * Extract headings từ content
 */
export function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}
