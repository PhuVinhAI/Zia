/**
 * Table Builder - Tạo bảng trong PowerPoint
 */

import { FONT_SIZES } from './constants.js';
import type { ParsedTable, PresentationTheme, TableStyle } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// MAIN TABLE BUILDER
// ═══════════════════════════════════════════════════

export function buildTable(
  slide: any,
  table: ParsedTable,
  startY: number,
  theme: PresentationTheme,
  style?: TableStyle,
): void {
  const tableData = buildTableData(table, theme, style);

  slide.addTable(tableData, {
    x: 0.5,
    y: startY,
    w: 9.0,
    colW: calculateColumnWidths(table.headers.length, 9.0),
    fontSize: style?.fontSize || FONT_SIZES.body - 2,
    fontFace: theme.fonts.body,
    border: { pt: 1, color: style?.borderColor || lightenColor(theme.colors.primary, 60) },
    autoPage: false,
  });
}

// ═══════════════════════════════════════════════════
// TABLE DATA BUILDER
// ═══════════════════════════════════════════════════

function buildTableData(table: ParsedTable, theme: PresentationTheme, style?: TableStyle): any[][] {
  const rows: any[][] = [];

  // Header row
  if (table.headers.length > 0) {
    const headerRow = table.headers.map((header) => ({
      text: header,
      options: {
        bold: true,
        fill: { color: style?.headerBackground || theme.colors.primary },
        color: style?.headerTextColor || 'FFFFFF',
        align: 'center',
        valign: 'middle',
      },
    }));
    rows.push(headerRow);
  }

  // Data rows
  table.rows.forEach((row, rowIndex) => {
    const isAlternate = rowIndex % 2 === 1;
    const rowData = row.map((cell) => ({
      text: cell,
      options: {
        fill: {
          color: isAlternate
            ? style?.alternateRowBackground || theme.colors.codeBackground
            : style?.rowBackground || theme.colors.background,
        },
        color: theme.colors.bodyText,
        align: 'left',
        valign: 'middle',
      },
    }));
    rows.push(rowData);
  });

  return rows;
}

// ═══════════════════════════════════════════════════
// STYLED TABLE BUILDER
// ═══════════════════════════════════════════════════

export function buildStyledTable(
  slide: any,
  table: ParsedTable,
  options: {
    x?: number | string;
    y?: number | string;
    width?: number;
    theme: PresentationTheme;
    style?: 'default' | 'striped' | 'bordered' | 'minimal' | 'colorful';
  },
): void {
  const { x = 0.5, y = 2.0, width = 9.0, theme, style = 'default' } = options;
  const tableStyle = getTableStyle(style, theme);
  const tableData = buildTableData(table, theme, tableStyle);

  slide.addTable(tableData, {
    x,
    y,
    w: width,
    colW: calculateColumnWidths(table.headers.length, width),
    fontSize: FONT_SIZES.body - 2,
    fontFace: theme.fonts.body,
    border: tableStyle.borderColor ? { pt: 1, color: tableStyle.borderColor } : { pt: 0 },
    autoPage: false,
  });
}

// ═══════════════════════════════════════════════════
// TABLE STYLES
// ═══════════════════════════════════════════════════

function getTableStyle(styleName: string, theme: PresentationTheme): TableStyle {
  const styles: Record<string, TableStyle> = {
    default: {
      headerBackground: theme.colors.primary,
      headerTextColor: 'FFFFFF',
      rowBackground: theme.colors.background,
      alternateRowBackground: theme.colors.codeBackground,
      borderColor: lightenColor(theme.colors.primary, 60),
    },
    striped: {
      headerBackground: theme.colors.secondary,
      headerTextColor: 'FFFFFF',
      rowBackground: 'FFFFFF',
      alternateRowBackground: 'F5F5F5',
      borderColor: 'E0E0E0',
    },
    bordered: {
      headerBackground: theme.colors.primary,
      headerTextColor: 'FFFFFF',
      rowBackground: 'FFFFFF',
      alternateRowBackground: 'FFFFFF',
      borderColor: theme.colors.primary,
    },
    minimal: {
      headerBackground: 'F5F5F5',
      headerTextColor: theme.colors.bodyText,
      rowBackground: 'FFFFFF',
      alternateRowBackground: 'FFFFFF',
      borderColor: 'E0E0E0',
    },
    colorful: {
      headerBackground: theme.colors.accent,
      headerTextColor: 'FFFFFF',
      rowBackground: theme.colors.background,
      alternateRowBackground: lightenColor(theme.colors.accent, 85),
      borderColor: lightenColor(theme.colors.accent, 60),
    },
  };

  return styles[styleName] || styles.default;
}

// ═══════════════════════════════════════════════════
// COMPARISON TABLE
// ═══════════════════════════════════════════════════

export function buildComparisonTable(
  slide: any,
  leftTitle: string,
  rightTitle: string,
  leftItems: string[],
  rightItems: string[],
  theme: PresentationTheme,
  y: number = 2.0,
): void {
  const maxRows = Math.max(leftItems.length, rightItems.length);
  const rows: any[][] = [];

  // Header
  rows.push([
    {
      text: leftTitle,
      options: {
        bold: true,
        fill: { color: theme.colors.primary },
        color: 'FFFFFF',
        align: 'center',
      },
    },
    {
      text: rightTitle,
      options: {
        bold: true,
        fill: { color: theme.colors.secondary },
        color: 'FFFFFF',
        align: 'center',
      },
    },
  ]);

  // Data rows
  for (let i = 0; i < maxRows; i++) {
    rows.push([
      {
        text: leftItems[i] || '',
        options: {
          fill: { color: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
          color: theme.colors.bodyText,
        },
      },
      {
        text: rightItems[i] || '',
        options: {
          fill: { color: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
          color: theme.colors.bodyText,
        },
      },
    ]);
  }

  slide.addTable(rows, {
    x: 0.5,
    y,
    w: 9.0,
    colW: [4.5, 4.5],
    fontSize: FONT_SIZES.body - 2,
    fontFace: theme.fonts.body,
    border: { pt: 1, color: lightenColor(theme.colors.primary, 60) },
  });
}

// ═══════════════════════════════════════════════════
// FEATURE TABLE
// ═══════════════════════════════════════════════════

export function buildFeatureTable(
  slide: any,
  features: Array<{ name: string; description: string; status?: 'yes' | 'no' | 'partial' }>,
  theme: PresentationTheme,
  y: number = 2.0,
): void {
  const rows: any[][] = [];

  // Header
  rows.push([
    {
      text: 'Feature',
      options: {
        bold: true,
        fill: { color: theme.colors.primary },
        color: 'FFFFFF',
        align: 'left',
      },
    },
    {
      text: 'Description',
      options: {
        bold: true,
        fill: { color: theme.colors.primary },
        color: 'FFFFFF',
        align: 'left',
      },
    },
    {
      text: 'Status',
      options: {
        bold: true,
        fill: { color: theme.colors.primary },
        color: 'FFFFFF',
        align: 'center',
      },
    },
  ]);

  // Data rows
  features.forEach((feature, i) => {
    const statusIcon = feature.status === 'yes' ? '✓' : feature.status === 'no' ? '✗' : '◐';
    const statusColor =
      feature.status === 'yes' ? '28A745' : feature.status === 'no' ? 'DC3545' : 'FFC107';

    rows.push([
      {
        text: feature.name,
        options: {
          bold: true,
          fill: { color: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
          color: theme.colors.bodyText,
        },
      },
      {
        text: feature.description,
        options: {
          fill: { color: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
          color: theme.colors.bodyText,
        },
      },
      {
        text: statusIcon,
        options: {
          fill: { color: i % 2 === 0 ? 'FFFFFF' : 'F5F5F5' },
          color: statusColor,
          align: 'center',
          fontSize: 20,
        },
      },
    ]);
  });

  slide.addTable(rows, {
    x: 0.5,
    y,
    w: 9.0,
    colW: [2.5, 5.0, 1.5],
    fontSize: FONT_SIZES.body - 2,
    fontFace: theme.fonts.body,
    border: { pt: 1, color: lightenColor(theme.colors.primary, 60) },
  });
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function calculateColumnWidths(columnCount: number, totalWidth: number): number[] {
  const colWidth = totalWidth / columnCount;
  return Array(columnCount).fill(colWidth);
}

export function parseMarkdownTable(markdown: string): ParsedTable | null {
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
  };

  // Check if it's a valid table
  if (!lines[0].includes('|')) return null;

  const headers = parseRow(lines[0]);

  // Skip separator line
  const dataLines = lines.filter((line, i) => i > 0 && !line.match(/^\|[\s-:|]+\|$/));
  const rows = dataLines.map(parseRow);

  return { headers, rows };
}
