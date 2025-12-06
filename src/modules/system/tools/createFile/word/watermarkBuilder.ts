/**
 * Watermark Builder - Tạo watermark cho documents
 * Note: docx library có hạn chế với watermark, đây là workaround
 */

import { AlignmentType, Header, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme, WatermarkConfig } from './types.js';

// ═══════════════════════════════════════════════════
// WATERMARK BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build watermark header (workaround for watermark)
 * Watermark sẽ xuất hiện ở header của mỗi trang
 */
export function buildWatermarkHeader(config: WatermarkConfig, theme?: DocumentTheme): Header {
  const t = theme || getTheme();
  const color = config.color || 'E0E0E0';

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: config.text,
            font: t.fonts.heading,
            size: 72,
            color,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

/**
 * Build draft watermark
 */
export function buildDraftWatermark(theme?: DocumentTheme): WatermarkConfig {
  return {
    text: 'BẢN NHÁP',
    color: 'FFE0E0',
  };
}

/**
 * Build confidential watermark
 */
export function buildConfidentialWatermark(theme?: DocumentTheme): WatermarkConfig {
  return {
    text: 'MẬT',
    color: 'FFE0E0',
  };
}

/**
 * Build sample watermark
 */
export function buildSampleWatermark(theme?: DocumentTheme): WatermarkConfig {
  return {
    text: 'MẪU',
    color: 'E0E0FF',
  };
}

/**
 * Parse watermark syntax
 * Syntax: [WATERMARK:text] hoặc [WATERMARK:text:color]
 */
export function parseWatermarkSyntax(content: string): WatermarkConfig | null {
  const match = content.match(/\[WATERMARK:([^:\]]+)(?::([^\]]+))?\]/i);
  if (!match) return null;

  return {
    text: match[1].trim(),
    color: match[2]?.trim(),
  };
}

/**
 * Remove watermark syntax từ content
 */
export function removeWatermarkSyntax(content: string): string {
  return content.replace(/\[WATERMARK:[^\]]+\]/gi, '').trim();
}

/**
 * Predefined watermarks
 */
export const PREDEFINED_WATERMARKS: Record<string, WatermarkConfig> = {
  draft: { text: 'BẢN NHÁP', color: 'FFE0E0' },
  confidential: { text: 'MẬT', color: 'FFE0E0' },
  sample: { text: 'MẪU', color: 'E0E0FF' },
  copy: { text: 'BẢN SAO', color: 'E0FFE0' },
  original: { text: 'BẢN GỐC', color: 'E0E0E0' },
  urgent: { text: 'KHẨN', color: 'FFE0E0' },
  approved: { text: 'ĐÃ DUYỆT', color: 'E0FFE0' },
  rejected: { text: 'TỪ CHỐI', color: 'FFE0E0' },
  pending: { text: 'CHỜ DUYỆT', color: 'FFFFE0' },
  internal: { text: 'NỘI BỘ', color: 'E0E0FF' },
};

/**
 * Get predefined watermark by name
 */
export function getPredefinedWatermark(name: string): WatermarkConfig | null {
  return PREDEFINED_WATERMARKS[name.toLowerCase()] || null;
}
