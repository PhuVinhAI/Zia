/**
 * Table Builder - Tạo bảng Word từ markdown table hoặc data
 */

import {
  BorderStyle,
  ExternalHyperlink,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { DocumentTheme, TableData, TableStyle } from './types.js';
import { getTheme } from './themes.js';
import { parseInline, hasStyle } from '../../../../../shared/utils/markdownParser.js';

/**
 * Parse cell text với markdown formatting
 */
function parseCellContent(
  text: string,
  theme: DocumentTheme,
  options?: { bold?: boolean; color?: string }
): (TextRun | ExternalHyperlink)[] {
  const tokens = parseInline(text);

  return tokens.map((token) => {
    const isBold = options?.bold || hasStyle(token, 'bold') || hasStyle(token, 'boldItalic');
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
            color: theme.colors.link,
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
      font: isCode ? theme.fonts.code : theme.fonts.body,
      shading: isCode ? { type: ShadingType.SOLID, color: theme.colors.codeBackground } : undefined,
      color: options?.color || theme.colors.text,
    });
  });
}

// ═══════════════════════════════════════════════════
// TABLE PARSER
// ═══════════════════════════════════════════════════

/**
 * Parse markdown table thành TableData
 */
export function parseMarkdownTable(content: string): TableData | null {
  const lines = content.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;

  // Check if it's a markdown table
  const isMarkdownTable = lines.some(line => line.includes('|'));
  if (!isMarkdownTable) return null;

  const parseRow = (line: string): string[] => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1 || arr.length === 1);
  };

  const headers = parseRow(lines[0]);
  if (headers.length === 0) return null;

  // Skip separator line (|---|---|)
  const startIndex = lines[1]?.match(/^[\s|:-]+$/) ? 2 : 1;
  
  const rows: string[][] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

// ═══════════════════════════════════════════════════
// TABLE BUILDER
// ═══════════════════════════════════════════════════

export function buildTable(
  data: TableData,
  theme?: DocumentTheme,
  customStyle?: TableStyle
): Table {
  const t = theme || getTheme();
  const style: TableStyle = {
    headerBackground: customStyle?.headerBackground || t.colors.tableHeader,
    headerTextColor: customStyle?.headerTextColor || t.colors.heading,
    stripedRows: customStyle?.stripedRows ?? true,
    stripeColor: customStyle?.stripeColor || t.colors.tableStripe,
    borderColor: customStyle?.borderColor || t.colors.tableBorder,
    borderWidth: customStyle?.borderWidth || 1,
  };

  const borderConfig = {
    style: BorderStyle.SINGLE,
    size: style.borderWidth! * 8,
    color: style.borderColor,
  };

  const borders = {
    top: borderConfig,
    bottom: borderConfig,
    left: borderConfig,
    right: borderConfig,
  };

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: data.headers.map(
      (header) =>
        new TableCell({
          children: [
            new Paragraph({
              children: parseCellContent(header, t, { bold: true, color: style.headerTextColor }) as TextRun[],
            }),
          ],
          shading: {
            type: ShadingType.SOLID,
            color: style.headerBackground,
          },
          verticalAlign: VerticalAlign.CENTER,
          borders,
        })
    ),
  });

  // Data rows
  const dataRows = data.rows.map((row, rowIndex) => {
    const isStriped = style.stripedRows && rowIndex % 2 === 1;
    return new TableRow({
      children: row.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: parseCellContent(cell, t) as TextRun[],
              }),
            ],
            shading: isStriped
              ? { type: ShadingType.SOLID, color: style.stripeColor }
              : undefined,
            verticalAlign: VerticalAlign.CENTER,
            borders,
          })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

/**
 * Build table từ CSV string
 */
export function buildTableFromCSV(csv: string, theme?: DocumentTheme): Table | null {
  const lines = csv.trim().split('\n').filter(line => line.trim());
  if (lines.length < 1) return null;

  const parseCSVRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVRow(lines[0]);
  const rows = lines.slice(1).map(parseCSVRow);

  return buildTable({ headers, rows }, theme);
}
