/**
 * PowerPoint Themes - Các theme có sẵn cho presentation
 */

import type { PresentationTheme } from './types.js';

// ═══════════════════════════════════════════════════
// PREDEFINED THEMES
// ═══════════════════════════════════════════════════

export const THEMES: Record<string, PresentationTheme> = {
  default: {
    name: 'Default',
    colors: {
      primary: '0066CC',
      secondary: '004499',
      accent: 'FF6600',
      background: 'FFFFFF',
      titleText: '0066CC',
      bodyText: '333333',
      link: '0066CC',
      codeBackground: 'F5F5F5',
      footerBackground: '0066CC',
    },
    fonts: {
      title: 'Arial',
      subtitle: 'Arial',
      body: 'Arial',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 12,
      lineHeight: 1.2,
    },
  },

  professional: {
    name: 'Professional',
    colors: {
      primary: '1A365D',
      secondary: '2C5282',
      accent: 'C05621',
      background: 'FFFFFF',
      titleText: '1A365D',
      bodyText: '2D3748',
      link: '2B6CB0',
      codeBackground: 'EDF2F7',
      footerBackground: '1A365D',
    },
    fonts: {
      title: 'Georgia',
      subtitle: 'Georgia',
      body: 'Calibri',
      code: 'Courier New',
    },
    spacing: {
      titleY: 0.6,
      subtitleY: 1.5,
      contentY: 2.2,
      bulletSpacing: 14,
      lineHeight: 1.3,
    },
  },

  modern: {
    name: 'Modern',
    colors: {
      primary: '6366F1',
      secondary: '8B5CF6',
      accent: 'EC4899',
      background: 'FFFFFF',
      titleText: '1E1B4B',
      bodyText: '374151',
      link: '6366F1',
      codeBackground: 'F3F4F6',
      footerBackground: '6366F1',
    },
    fonts: {
      title: 'Segoe UI',
      subtitle: 'Segoe UI Light',
      body: 'Segoe UI',
      code: 'Cascadia Code',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.3,
      contentY: 1.9,
      bulletSpacing: 10,
      lineHeight: 1.15,
    },
  },

  dark: {
    name: 'Dark',
    colors: {
      primary: '60A5FA',
      secondary: '3B82F6',
      accent: 'F59E0B',
      background: '1F2937',
      titleText: 'F9FAFB',
      bodyText: 'E5E7EB',
      link: '60A5FA',
      codeBackground: '374151',
      footerBackground: '111827',
    },
    fonts: {
      title: 'Segoe UI',
      subtitle: 'Segoe UI',
      body: 'Segoe UI',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 12,
      lineHeight: 1.2,
    },
  },

  minimal: {
    name: 'Minimal',
    colors: {
      primary: '18181B',
      secondary: '3F3F46',
      accent: '71717A',
      background: 'FAFAFA',
      titleText: '09090B',
      bodyText: '27272A',
      link: '18181B',
      codeBackground: 'F4F4F5',
      footerBackground: 'E4E4E7',
    },
    fonts: {
      title: 'Arial',
      subtitle: 'Arial',
      body: 'Arial',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 10,
      lineHeight: 1.15,
    },
  },

  corporate: {
    name: 'Corporate',
    colors: {
      primary: '003366',
      secondary: '336699',
      accent: 'CC3300',
      background: 'FFFFFF',
      titleText: '003366',
      bodyText: '333333',
      link: '003366',
      codeBackground: 'F0F0F0',
      footerBackground: '003366',
    },
    fonts: {
      title: 'Calibri',
      subtitle: 'Calibri',
      body: 'Calibri',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 12,
      lineHeight: 1.2,
    },
  },

  creative: {
    name: 'Creative',
    colors: {
      primary: 'E91E63',
      secondary: '9C27B0',
      accent: '00BCD4',
      background: 'FFFFFF',
      titleText: 'E91E63',
      bodyText: '424242',
      link: 'E91E63',
      codeBackground: 'FCE4EC',
      footerBackground: 'E91E63',
    },
    fonts: {
      title: 'Trebuchet MS',
      subtitle: 'Trebuchet MS',
      body: 'Calibri',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.3,
      contentY: 1.9,
      bulletSpacing: 11,
      lineHeight: 1.2,
    },
  },

  nature: {
    name: 'Nature',
    colors: {
      primary: '2E7D32',
      secondary: '388E3C',
      accent: '8BC34A',
      background: 'FFFFFF',
      titleText: '1B5E20',
      bodyText: '33691E',
      link: '2E7D32',
      codeBackground: 'E8F5E9',
      footerBackground: '2E7D32',
    },
    fonts: {
      title: 'Georgia',
      subtitle: 'Georgia',
      body: 'Calibri',
      code: 'Consolas',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 12,
      lineHeight: 1.25,
    },
  },

  tech: {
    name: 'Tech',
    colors: {
      primary: '00ACC1',
      secondary: '0097A7',
      accent: '26C6DA',
      background: '263238',
      titleText: '80DEEA',
      bodyText: 'B0BEC5',
      link: '00ACC1',
      codeBackground: '37474F',
      footerBackground: '1C313A',
    },
    fonts: {
      title: 'Roboto',
      subtitle: 'Roboto Light',
      body: 'Roboto',
      code: 'Roboto Mono',
    },
    spacing: {
      titleY: 0.5,
      subtitleY: 1.4,
      contentY: 2.0,
      bulletSpacing: 11,
      lineHeight: 1.2,
    },
  },

  elegant: {
    name: 'Elegant',
    colors: {
      primary: '5D4037',
      secondary: '795548',
      accent: 'D7CCC8',
      background: 'EFEBE9',
      titleText: '3E2723',
      bodyText: '4E342E',
      link: '5D4037',
      codeBackground: 'D7CCC8',
      footerBackground: '5D4037',
    },
    fonts: {
      title: 'Palatino Linotype',
      subtitle: 'Palatino Linotype',
      body: 'Book Antiqua',
      code: 'Courier New',
    },
    spacing: {
      titleY: 0.6,
      subtitleY: 1.5,
      contentY: 2.2,
      bulletSpacing: 14,
      lineHeight: 1.3,
    },
  },
};

// ═══════════════════════════════════════════════════
// THEME HELPERS
// ═══════════════════════════════════════════════════

export function getTheme(name?: string): PresentationTheme {
  if (!name) return THEMES.default;
  return THEMES[name.toLowerCase()] || THEMES.default;
}

export function getThemeNames(): string[] {
  return Object.keys(THEMES);
}

export function isDarkTheme(theme: PresentationTheme): boolean {
  const bg = theme.colors.background;
  // Simple check: if background is dark (low RGB values)
  const r = parseInt(bg.substring(0, 2), 16);
  const g = parseInt(bg.substring(2, 4), 16);
  const b = parseInt(bg.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}
