/**
 * Column Builder - Tạo layout nhiều cột
 */

import { Paragraph, SectionType, TextRun } from 'docx';

// ═══════════════════════════════════════════════════
// COLUMN TYPES
// ═══════════════════════════════════════════════════

export interface ColumnConfig {
  count: 2 | 3;
  space?: number; // Space between columns in twips
  equalWidth?: boolean;
}

export interface ColumnSection {
  content: string;
  columnConfig: ColumnConfig;
}

// ═══════════════════════════════════════════════════
// COLUMN SECTION PROPERTIES
// ═══════════════════════════════════════════════════

/**
 * Build section properties cho multi-column layout
 */
export function buildColumnSectionProperties(config: ColumnConfig) {
  return {
    type: SectionType.CONTINUOUS,
    column: {
      count: config.count,
      space: config.space || 720, // Default 0.5 inch
      equalWidth: config.equalWidth ?? true,
    },
  };
}

/**
 * Build section properties để reset về single column
 */
export function buildSingleColumnSectionProperties() {
  return {
    type: SectionType.CONTINUOUS,
    column: {
      count: 1,
    },
  };
}

// ═══════════════════════════════════════════════════
// COLUMN PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse column syntax từ content
 * Syntax:
 * [COLUMNS:2]
 * content...
 * [/COLUMNS]
 */
export function parseColumnSections(content: string): {
  beforeColumns: string;
  columnSections: ColumnSection[];
  afterColumns: string;
} {
  const result = {
    beforeColumns: '',
    columnSections: [] as ColumnSection[],
    afterColumns: '',
  };

  const columnRegex = /\[COLUMNS:(\d)\]([\s\S]*?)\[\/COLUMNS\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = columnRegex.exec(content)) !== null) {
    // Content before this column section
    if (match.index > lastIndex) {
      if (result.columnSections.length === 0) {
        result.beforeColumns += content.slice(lastIndex, match.index);
      }
    }

    const columnCount = parseInt(match[1], 10) as 2 | 3;
    if (columnCount === 2 || columnCount === 3) {
      result.columnSections.push({
        content: match[2].trim(),
        columnConfig: { count: columnCount },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Content after all column sections
  if (lastIndex < content.length) {
    result.afterColumns = content.slice(lastIndex);
  } else if (lastIndex === 0) {
    result.beforeColumns = content;
  }

  return result;
}

// ═══════════════════════════════════════════════════
// COLUMN BREAK
// ═══════════════════════════════════════════════════

/**
 * Build column break paragraph
 */
export function buildColumnBreak(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '',
      }),
    ],
    pageBreakBefore: false,
  });
}

/**
 * Check if line is column break marker
 */
export function isColumnBreak(line: string): boolean {
  return line.trim() === '[COLUMN_BREAK]' || line.trim() === '---COL---';
}
