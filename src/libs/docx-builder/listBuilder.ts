/**
 * List Builder - Xử lý các loại list nâng cao
 */

import { Paragraph, TextRun } from 'docx';
import { parseInline } from '../../../../../shared/utils/markdownParser.js';
import { tokensToTextRuns } from './contentBuilder.js';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// CHECKLIST BUILDER
// ═══════════════════════════════════════════════════

export interface ChecklistItem {
  text: string;
  checked: boolean;
  indent: number;
}

/**
 * Parse checklist từ markdown
 * Syntax: - [ ] unchecked, - [x] checked
 */
export function parseChecklist(content: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (match) {
      items.push({
        text: match[3].trim(),
        checked: match[2].toLowerCase() === 'x',
        indent: Math.floor(match[1].length / 2),
      });
    }
  }

  return items;
}

/**
 * Build checklist paragraph
 * Sử dụng emoji thay vì CheckBox vì CheckBox yêu cầu hex code
 */
export function buildChecklistItem(item: ChecklistItem, theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();
  const tokens = parseInline(item.text);
  const checkIcon = item.checked ? '☑' : '☐';
  const checkColor = item.checked ? '4CAF50' : t.colors.text; // Green for checked

  return new Paragraph({
    children: [
      new TextRun({
        text: `${checkIcon} `,
        font: 'Segoe UI Symbol',
        size: 22,
        color: checkColor,
      }),
      ...(tokensToTextRuns(tokens, t) as TextRun[]),
    ],
    indent: { left: item.indent * 360 },
    spacing: { after: 80 },
  });
}

/**
 * Build full checklist
 */
export function buildChecklist(items: ChecklistItem[], theme?: DocumentTheme): Paragraph[] {
  return items.map((item) => buildChecklistItem(item, theme));
}

// ═══════════════════════════════════════════════════
// DEFINITION LIST BUILDER
// ═══════════════════════════════════════════════════

export interface DefinitionItem {
  term: string;
  definition: string;
}

/**
 * Parse definition list
 * Syntax:
 * Term
 * : Definition
 */
export function parseDefinitionList(content: string): DefinitionItem[] {
  const items: DefinitionItem[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1]?.trim();

    if (nextLine?.startsWith(': ')) {
      items.push({
        term: line,
        definition: nextLine.slice(2).trim(),
      });
      i++; // Skip definition line
    }
  }

  return items;
}

/**
 * Build definition list paragraphs
 */
export function buildDefinitionList(items: DefinitionItem[], theme?: DocumentTheme): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];

  for (const item of items) {
    // Term (bold)
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item.term,
            bold: true,
            font: t.fonts.body,
            color: t.colors.heading,
          }),
        ],
        spacing: { before: 120, after: 40 },
      }),
    );

    // Definition (indented)
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item.definition,
            font: t.fonts.body,
            color: t.colors.text,
          }),
        ],
        indent: { left: 360 },
        spacing: { after: 120 },
      }),
    );
  }

  return paragraphs;
}

// ═══════════════════════════════════════════════════
// NESTED LIST UTILITIES
// ═══════════════════════════════════════════════════

/**
 * Calculate list indent level từ whitespace
 */
export function calculateIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  return Math.floor(match[1].length / 2);
}

/**
 * Check if line is a list item
 */
export function isListItem(
  line: string,
): { type: 'bullet' | 'numbered' | 'checklist'; indent: number } | null {
  const trimmed = line.trim();
  const indent = calculateIndentLevel(line);

  // Checklist
  if (/^[-*]\s*\[[ xX]\]/.test(trimmed)) {
    return { type: 'checklist', indent };
  }

  // Bullet
  if (/^[-*+]\s+/.test(trimmed)) {
    return { type: 'bullet', indent };
  }

  // Numbered
  if (/^\d+\.\s+/.test(trimmed)) {
    return { type: 'numbered', indent };
  }

  return null;
}
