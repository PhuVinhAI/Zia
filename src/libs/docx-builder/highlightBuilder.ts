/**
 * Highlight Builder - Text highlighting và marking
 */

import { HighlightColor, Paragraph, ShadingType, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// HIGHLIGHT TYPES
// ═══════════════════════════════════════════════════

export type HighlightColorName =
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'magenta'
  | 'blue'
  | 'red'
  | 'darkBlue'
  | 'darkCyan'
  | 'darkGreen'
  | 'darkMagenta'
  | 'darkRed'
  | 'darkYellow'
  | 'lightGray'
  | 'darkGray';

export interface HighlightConfig {
  text: string;
  color: HighlightColorName;
}

// ═══════════════════════════════════════════════════
// HIGHLIGHT COLOR MAPPING
// ═══════════════════════════════════════════════════

const HIGHLIGHT_COLORS: Record<
  HighlightColorName,
  (typeof HighlightColor)[keyof typeof HighlightColor]
> = {
  yellow: HighlightColor.YELLOW,
  green: HighlightColor.GREEN,
  cyan: HighlightColor.CYAN,
  magenta: HighlightColor.MAGENTA,
  blue: HighlightColor.BLUE,
  red: HighlightColor.RED,
  darkBlue: HighlightColor.DARK_BLUE,
  darkCyan: HighlightColor.DARK_CYAN,
  darkGreen: HighlightColor.DARK_GREEN,
  darkMagenta: HighlightColor.DARK_MAGENTA,
  darkRed: HighlightColor.DARK_RED,
  darkYellow: HighlightColor.DARK_YELLOW,
  lightGray: HighlightColor.LIGHT_GRAY,
  darkGray: HighlightColor.DARK_GRAY,
};

// ═══════════════════════════════════════════════════
// HIGHLIGHT BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build highlighted TextRun
 */
export function buildHighlightedRun(
  text: string,
  color: HighlightColorName = 'yellow',
  theme?: DocumentTheme,
): TextRun {
  const t = theme || getTheme();

  return new TextRun({
    text,
    font: t.fonts.body,
    highlight: HIGHLIGHT_COLORS[color],
  });
}

/**
 * Build marked/underlined TextRun
 */
export function buildMarkedRun(text: string, theme?: DocumentTheme): TextRun {
  const t = theme || getTheme();

  return new TextRun({
    text,
    font: t.fonts.body,
    shading: {
      type: ShadingType.SOLID,
      color: 'FFEB3B',
    },
  });
}

/**
 * Parse highlight syntax từ text
 * Syntax: ==highlighted text== hoặc [HIGHLIGHT:color]text[/HIGHLIGHT]
 */
export function parseHighlights(text: string): {
  segments: { text: string; highlight?: HighlightColorName }[];
} {
  const segments: { text: string; highlight?: HighlightColorName }[] = [];

  // First, handle colored highlights
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Combine both patterns
  const combinedPattern = /==([^=]+)==|\[HIGHLIGHT:(\w+)\]([^[]+)\[\/HIGHLIGHT\]/gi;

  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Simple ==text== pattern
      segments.push({ text: match[1], highlight: 'yellow' });
    } else if (match[2] && match[3]) {
      // [HIGHLIGHT:color]text[/HIGHLIGHT] pattern
      const color = match[2].toLowerCase() as HighlightColorName;
      segments.push({
        text: match[3],
        highlight: HIGHLIGHT_COLORS[color] ? color : 'yellow',
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return { segments };
}

/**
 * Check if text contains highlights
 */
export function hasHighlights(text: string): boolean {
  return /==([^=]+)==/.test(text) || /\[HIGHLIGHT:\w+\][^[]+\[\/HIGHLIGHT\]/i.test(text);
}

/**
 * Build paragraph with highlights
 */
export function buildHighlightedParagraph(text: string, theme?: DocumentTheme): Paragraph {
  const t = theme || getTheme();
  const { segments } = parseHighlights(text);

  const children = segments.map((seg) => {
    if (seg.highlight) {
      return buildHighlightedRun(seg.text, seg.highlight, t);
    }
    return new TextRun({
      text: seg.text,
      font: t.fonts.body,
      color: t.colors.text,
    });
  });

  return new Paragraph({
    children,
    spacing: { after: t.spacing.paragraphAfter },
  });
}
