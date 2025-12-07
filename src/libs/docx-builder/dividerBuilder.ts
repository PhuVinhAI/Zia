/**
 * Divider Builder - Tạo các loại divider/separator
 */

import { BorderStyle, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// DIVIDER TYPES
// ═══════════════════════════════════════════════════

export type DividerStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'wave'
  | 'thick'
  | 'decorated';

export interface DividerConfig {
  style?: DividerStyle;
  color?: string;
  width?: number;
  spacing?: number;
}

// ═══════════════════════════════════════════════════
// DIVIDER BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build divider paragraph
 */
export function buildDivider(config?: DividerConfig, theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();
  const style = config?.style || 'solid';
  const color = config?.color || t.colors.tableBorder;
  const spacing = config?.spacing || 200;

  const borderStyleMap: Record<DividerStyle, (typeof BorderStyle)[keyof typeof BorderStyle]> = {
    solid: BorderStyle.SINGLE,
    dashed: BorderStyle.DASHED,
    dotted: BorderStyle.DOTTED,
    double: BorderStyle.DOUBLE,
    wave: BorderStyle.WAVE,
    thick: BorderStyle.THICK,
    decorated: BorderStyle.THREE_D_EMBOSS,
  };

  const sizeMap: Record<DividerStyle, number> = {
    solid: 6,
    dashed: 6,
    dotted: 6,
    double: 6,
    wave: 6,
    thick: 18,
    decorated: 12,
  };

  return new Paragraph({
    border: {
      bottom: {
        style: borderStyleMap[style],
        size: config?.width || sizeMap[style],
        color,
      },
    },
    spacing: { before: spacing, after: spacing },
  });
}

/**
 * Build decorated divider với text ở giữa
 */
export function buildDecoratedDivider(text: string, theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();

  return new Paragraph({
    alignment: 'center',
    children: [
      new TextRun({
        text: `─────── ${text} ───────`,
        font: t.fonts.body,
        size: 20,
        color: t.colors.secondary,
      }),
    ],
    spacing: { before: 200, after: 200 },
  });
}

/**
 * Build star divider
 */
export function buildStarDivider(theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();

  return new Paragraph({
    alignment: 'center',
    children: [
      new TextRun({
        text: '✦ ✦ ✦',
        font: t.fonts.body,
        size: 24,
        color: t.colors.accent,
      }),
    ],
    spacing: { before: 200, after: 200 },
  });
}

/**
 * Build ornament divider
 */
export function buildOrnamentDivider(
  ornament: 'floral' | 'geometric' | 'classic' | 'modern',
  theme?: DocumentTheme,
): Paragraph {
  const t = theme || getTheme();

  const ornaments = {
    floral: '❧ ❦ ❧',
    geometric: '◆ ◇ ◆',
    classic: '※ ※ ※',
    modern: '▬▬▬ ◈ ▬▬▬',
  };

  return new Paragraph({
    alignment: 'center',
    children: [
      new TextRun({
        text: ornaments[ornament],
        font: t.fonts.body,
        size: 24,
        color: t.colors.secondary,
      }),
    ],
    spacing: { before: 200, after: 200 },
  });
}

/**
 * Parse divider syntax
 * Syntax: [DIVIDER], [DIVIDER:style], [DIVIDER:decorated:text]
 */
export function parseDividerSyntax(
  line: string,
): DividerConfig | { decorated: true; text: string } | null {
  const trimmed = line.trim();

  // Simple divider
  if (trimmed === '[DIVIDER]' || trimmed === '***' || trimmed === '---' || trimmed === '___') {
    return { style: 'solid' };
  }

  // Styled divider
  const styleMatch = trimmed.match(/^\[DIVIDER:(\w+)\]$/i);
  if (styleMatch) {
    const style = styleMatch[1].toLowerCase();
    if (['solid', 'dashed', 'dotted', 'double', 'wave', 'thick'].includes(style)) {
      return { style: style as DividerStyle };
    }
  }

  // Decorated divider with text
  const decoratedMatch = trimmed.match(/^\[DIVIDER:decorated:(.+)\]$/i);
  if (decoratedMatch) {
    return { decorated: true, text: decoratedMatch[1].trim() };
  }

  // Ornament dividers
  if (trimmed === '[DIVIDER:star]') return { style: 'decorated' };
  if (trimmed === '[DIVIDER:floral]') return { style: 'decorated' };

  return null;
}

/**
 * Check if line is a divider
 */
export function isDivider(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === '[DIVIDER]' ||
    /^\[DIVIDER:\w+\]$/i.test(trimmed) ||
    /^\[DIVIDER:decorated:.+\]$/i.test(trimmed) ||
    /^[-*_]{3,}$/.test(trimmed)
  );
}
