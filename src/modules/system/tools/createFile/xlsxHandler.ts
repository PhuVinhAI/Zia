/**
 * Excel (XLSX) Handler - Tạo file Excel từ markdown table hoặc CSV
 * Sử dụng ExcelJS
 */

import ExcelJS from 'exceljs';
import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';

/**
 * Parse markdown table thành 2D array
 */
function parseMarkdownTable(content: string): string[][] {
  const lines = content.trim().split('\n');
  const rows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip separator lines (|---|---|)
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;
    // Skip empty lines
    if (!trimmed) continue;

    // Parse table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1) // Remove leading/trailing |
        .split('|')
        .map((cell) => cell.trim());
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * Parse CSV thành 2D array
 */
function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map((line) => {
    // Simple CSV parsing (không xử lý quoted fields phức tạp)
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

/**
 * Detect content type và parse
 */
function parseContent(content: string): { data: string[][]; hasHeader: boolean } {
  const trimmed = content.trim();

  // Check if markdown table
  if (trimmed.includes('|')) {
    return { data: parseMarkdownTable(trimmed), hasHeader: true };
  }

  // Assume CSV
  return { data: parseCSV(trimmed), hasHeader: true };
}

/**
 * Tạo Excel file từ content
 */
export async function xlsxHandler(content: string, options?: CreateFileParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Set metadata
  workbook.creator = options?.author || 'Zia Bot';
  workbook.created = new Date();

  // Create worksheet
  const sheetName = options?.title || 'Sheet1';
  const worksheet = workbook.addWorksheet(sheetName);

  // Parse content
  const { data, hasHeader } = parseContent(content);

  if (data.length === 0) {
    // Empty content - add placeholder
    worksheet.addRow(['No data']);
  } else {
    // Add rows
    for (let i = 0; i < data.length; i++) {
      const row = worksheet.addRow(data[i]);

      // Style header row
      if (i === 0 && hasHeader) {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }, // Blue background
        };
        row.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: Partial<ExcelJS.Column>) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
        const cellValue = cell.value?.toString() || '';
        maxLength = Math.max(maxLength, cellValue.length + 2);
      });
      column.width = Math.min(maxLength, 50); // Max 50 chars
    });

    // Add borders to all cells
    worksheet.eachRow((row: ExcelJS.Row) => {
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  // Write to buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
