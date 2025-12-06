/**
 * Footnote Builder - Xử lý footnotes trong Word document
 */

import { FootnoteReferenceRun, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// FOOTNOTE TYPES
// ═══════════════════════════════════════════════════

export interface FootnoteData {
  id: number;
  text: string;
}

// ═══════════════════════════════════════════════════
// FOOTNOTE PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse footnotes từ content
 * Syntax: text[^1] ... [^1]: footnote content
 */
export function parseFootnotes(content: string): {
  cleanContent: string;
  footnotes: FootnoteData[];
} {
  const footnotes: FootnoteData[] = [];
  let cleanContent = content;

  // Find footnote definitions [^n]: text
  const defRegex = /\[\^(\d+)\]:\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = defRegex.exec(content)) !== null) {
    footnotes.push({
      id: parseInt(match[1]),
      text: match[2].trim(),
    });
    // Remove definition from content
    cleanContent = cleanContent.replace(match[0], '');
  }

  return { cleanContent: cleanContent.trim(), footnotes };
}

/**
 * Build footnote reference trong text
 */
export function buildFootnoteReference(id: number): FootnoteReferenceRun {
  return new FootnoteReferenceRun(id);
}

/**
 * Build footnote content paragraphs
 */
export function buildFootnoteContent(
  footnotes: FootnoteData[],
  theme?: DocumentTheme,
): { [key: number]: { children: Paragraph[] } } {
  const t = theme || getTheme();
  const result: { [key: number]: { children: Paragraph[] } } = {};

  for (const fn of footnotes) {
    result[fn.id] = {
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: fn.text,
              size: 18,
              font: t.fonts.body,
              color: t.colors.secondary,
            }),
          ],
        }),
      ],
    };
  }

  return result;
}

/**
 * Replace footnote references trong text với markers
 * Returns text với [FOOTNOTE:n] markers
 */
export function markFootnoteReferences(text: string): string {
  return text.replace(/\[\^(\d+)\]/g, '[FOOTNOTE:$1]');
}

/**
 * Check if text contains footnote reference
 */
export function hasFootnoteReference(text: string): boolean {
  return /\[\^(\d+)\]/.test(text);
}
