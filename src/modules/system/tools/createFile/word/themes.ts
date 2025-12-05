/**
 * Word Document Themes - Các theme có sẵn cho document
 */

import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// PREDEFINED THEMES
// ═══════════════════════════════════════════════════

export const THEMES: Record<string, DocumentTheme> = {
  default: {
    name: 'Default',
    colors: {
      primary: '2B579A',
      secondary: '5B9BD5',
      accent: 'ED7D31',
      heading: '1F4E79',
      text: '333333',
      link: '0563C1',
      codeBackground: 'F5F5F5',
      tableBorder: 'BFBFBF',
      tableHeader: 'D9E2F3',
      tableStripe: 'F2F2F2',
    },
    fonts: {
      heading: 'Calibri Light',
      body: 'Calibri',
      code: 'Consolas',
    },
    spacing: {
      paragraphAfter: 200,
      headingBefore: 280,
      headingAfter: 140,
      listItemAfter: 80,
      lineSpacing: 276, // 1.15 line spacing
    },
  },

  professional: {
    name: 'Professional',
    colors: {
      primary: '1A365D',
      secondary: '2C5282',
      accent: 'C05621',
      heading: '1A365D',
      text: '2D3748',
      link: '2B6CB0',
      codeBackground: 'EDF2F7',
      tableBorder: 'CBD5E0',
      tableHeader: 'E2E8F0',
      tableStripe: 'F7FAFC',
    },
    fonts: {
      heading: 'Georgia',
      body: 'Times New Roman',
      code: 'Courier New',
    },
    spacing: {
      paragraphAfter: 240,
      headingBefore: 320,
      headingAfter: 160,
      listItemAfter: 100,
      lineSpacing: 360, // 1.5 line spacing
    },
  },

  modern: {
    name: 'Modern',
    colors: {
      primary: '6366F1',
      secondary: '8B5CF6',
      accent: 'EC4899',
      heading: '1E1B4B',
      text: '374151',
      link: '6366F1',
      codeBackground: 'F3F4F6',
      tableBorder: 'E5E7EB',
      tableHeader: 'EEF2FF',
      tableStripe: 'F9FAFB',
    },
    fonts: {
      heading: 'Segoe UI',
      body: 'Segoe UI',
      code: 'Cascadia Code',
    },
    spacing: {
      paragraphAfter: 180,
      headingBefore: 260,
      headingAfter: 120,
      listItemAfter: 60,
      lineSpacing: 264, // 1.1 line spacing
    },
  },

  academic: {
    name: 'Academic',
    colors: {
      primary: '7C2D12',
      secondary: '92400E',
      accent: '065F46',
      heading: '1C1917',
      text: '292524',
      link: '1D4ED8',
      codeBackground: 'FAFAF9',
      tableBorder: 'D6D3D1',
      tableHeader: 'F5F5F4',
      tableStripe: 'FAFAF9',
    },
    fonts: {
      heading: 'Times New Roman',
      body: 'Times New Roman',
      code: 'Courier New',
    },
    spacing: {
      paragraphAfter: 240,
      headingBefore: 360,
      headingAfter: 180,
      listItemAfter: 120,
      lineSpacing: 480, // Double spacing
    },
  },

  minimal: {
    name: 'Minimal',
    colors: {
      primary: '18181B',
      secondary: '3F3F46',
      accent: '71717A',
      heading: '09090B',
      text: '27272A',
      link: '18181B',
      codeBackground: 'FAFAFA',
      tableBorder: 'E4E4E7',
      tableHeader: 'F4F4F5',
      tableStripe: 'FAFAFA',
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial',
      code: 'Consolas',
    },
    spacing: {
      paragraphAfter: 160,
      headingBefore: 240,
      headingAfter: 120,
      listItemAfter: 60,
      lineSpacing: 240, // Single spacing
    },
  },
};

export function getTheme(name?: string): DocumentTheme {
  if (!name) return THEMES.default;
  return THEMES[name.toLowerCase()] || THEMES.default;
}

export function getThemeNames(): string[] {
  return Object.keys(THEMES);
}
