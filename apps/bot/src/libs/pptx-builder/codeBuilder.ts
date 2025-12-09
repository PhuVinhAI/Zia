/**
 * Code Builder - Tạo code blocks trong PowerPoint
 */

import { FONT_SIZES } from './constants.js';
import type { ParsedCodeBlock, PresentationTheme } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// MAIN CODE BLOCK BUILDER
// ═══════════════════════════════════════════════════

export function buildCodeBlock(
  slide: any,
  codeBlock: ParsedCodeBlock,
  startY: number,
  theme: PresentationTheme,
): void {
  const { code, language } = codeBlock;

  // Calculate height based on lines
  const lines = code.split('\n').length;
  const height = Math.min(Math.max(lines * 0.25, 1.0), 3.5);

  // Language label
  if (language) {
    slide.addText(language.toUpperCase(), {
      x: 0.5,
      y: startY - 0.3,
      w: 1.5,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: theme.colors.primary,
      fontFace: theme.fonts.body,
    });
  }

  // Code block background
  slide.addShape('rect', {
    x: 0.5,
    y: startY,
    w: 9.0,
    h: height,
    fill: { color: theme.colors.codeBackground },
    line: { color: lightenColor(theme.colors.primary, 60), pt: 1 },
  });

  // Code text
  slide.addText(code, {
    x: 0.6,
    y: startY + 0.1,
    w: 8.8,
    h: height - 0.2,
    fontSize: FONT_SIZES.code,
    color: theme.colors.bodyText,
    fontFace: theme.fonts.code,
    valign: 'top',
    wrap: true,
  });
}

// ═══════════════════════════════════════════════════
// STYLED CODE BLOCK
// ═══════════════════════════════════════════════════

export function buildStyledCodeBlock(
  slide: any,
  code: string,
  options: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    language?: string;
    theme: PresentationTheme;
    style?: 'default' | 'dark' | 'light' | 'terminal';
    showLineNumbers?: boolean;
  },
): void {
  const {
    x = 0.5,
    y = 2.0,
    width = 9.0,
    height = 2.0,
    language,
    theme,
    style = 'default',
    showLineNumbers = false,
  } = options;

  const codeStyle = getCodeStyle(style, theme);

  // Background
  slide.addShape('rect', {
    x,
    y,
    w: width,
    h: height,
    fill: { color: codeStyle.background },
    line: { color: codeStyle.border, pt: 1 },
    shadow:
      style === 'terminal'
        ? { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
        : undefined,
  });

  // Terminal header (for terminal style)
  if (style === 'terminal') {
    // Terminal buttons
    const buttonY = typeof y === 'number' ? y + 0.1 : y;
    slide.addShape('ellipse', {
      x: typeof x === 'number' ? x + 0.2 : x,
      y: buttonY,
      w: 0.15,
      h: 0.15,
      fill: { color: 'FF5F56' },
    });
    slide.addShape('ellipse', {
      x: typeof x === 'number' ? x + 0.4 : x,
      y: buttonY,
      w: 0.15,
      h: 0.15,
      fill: { color: 'FFBD2E' },
    });
    slide.addShape('ellipse', {
      x: typeof x === 'number' ? x + 0.6 : x,
      y: buttonY,
      w: 0.15,
      h: 0.15,
      fill: { color: '27CA40' },
    });
  }

  // Language label
  if (language) {
    slide.addText(language, {
      x: typeof x === 'number' ? x + (typeof width === 'number' ? width - 1.5 : 7.5) : x,
      y: typeof y === 'number' ? y + 0.05 : y,
      w: 1.4,
      h: 0.25,
      fontSize: 9,
      color: codeStyle.labelColor,
      fontFace: theme.fonts.body,
      align: 'right',
    });
  }

  // Prepare code with line numbers if needed
  let displayCode = code;
  if (showLineNumbers) {
    const lines = code.split('\n');
    const maxDigits = String(lines.length).length;
    displayCode = lines
      .map((line, i) => `${String(i + 1).padStart(maxDigits, ' ')} │ ${line}`)
      .join('\n');
  }

  // Code text
  const codeY =
    style === 'terminal'
      ? typeof y === 'number'
        ? y + 0.4
        : y
      : typeof y === 'number'
        ? y + 0.15
        : y;
  const codeHeight =
    style === 'terminal'
      ? typeof height === 'number'
        ? height - 0.5
        : height
      : typeof height === 'number'
        ? height - 0.3
        : height;

  slide.addText(displayCode, {
    x: typeof x === 'number' ? x + 0.15 : x,
    y: codeY,
    w: typeof width === 'number' ? width - 0.3 : width,
    h: codeHeight,
    fontSize: FONT_SIZES.code,
    color: codeStyle.textColor,
    fontFace: theme.fonts.code,
    valign: 'top',
    wrap: true,
  });
}

// ═══════════════════════════════════════════════════
// INLINE CODE
// ═══════════════════════════════════════════════════

export function buildInlineCode(text: string, theme: PresentationTheme): any {
  return {
    text,
    options: {
      fontFace: theme.fonts.code,
      fontSize: FONT_SIZES.code,
      color: theme.colors.bodyText,
      highlight: theme.colors.codeBackground,
    },
  };
}

// ═══════════════════════════════════════════════════
// CODE COMPARISON
// ═══════════════════════════════════════════════════

export function buildCodeComparison(
  slide: any,
  leftCode: { code: string; title: string; language?: string },
  rightCode: { code: string; title: string; language?: string },
  theme: PresentationTheme,
  y: number = 1.8,
): void {
  const width = 4.3;

  // Left code block
  slide.addText(leftCode.title, {
    x: 0.5,
    y: y - 0.4,
    w: width,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: theme.colors.primary,
    fontFace: theme.fonts.body,
  });

  buildStyledCodeBlock(slide, leftCode.code, {
    x: 0.5,
    y,
    width,
    height: 3.0,
    language: leftCode.language,
    theme,
    style: 'default',
  });

  // Right code block
  slide.addText(rightCode.title, {
    x: 5.2,
    y: y - 0.4,
    w: width,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: theme.colors.secondary,
    fontFace: theme.fonts.body,
  });

  buildStyledCodeBlock(slide, rightCode.code, {
    x: 5.2,
    y,
    width,
    height: 3.0,
    language: rightCode.language,
    theme,
    style: 'default',
  });
}

// ═══════════════════════════════════════════════════
// CODE STYLES
// ═══════════════════════════════════════════════════

interface CodeStyle {
  background: string;
  textColor: string;
  border: string;
  labelColor: string;
}

function getCodeStyle(styleName: string, theme: PresentationTheme): CodeStyle {
  const styles: Record<string, CodeStyle> = {
    default: {
      background: theme.colors.codeBackground,
      textColor: theme.colors.bodyText,
      border: lightenColor(theme.colors.primary, 60),
      labelColor: lightenColor(theme.colors.primary, 30),
    },
    dark: {
      background: '1E1E1E',
      textColor: 'D4D4D4',
      border: '3C3C3C',
      labelColor: '808080',
    },
    light: {
      background: 'FAFAFA',
      textColor: '333333',
      border: 'E0E0E0',
      labelColor: '999999',
    },
    terminal: {
      background: '1D1F21',
      textColor: 'C5C8C6',
      border: '373B41',
      labelColor: '969896',
    },
  };

  return styles[styleName] || styles.default;
}

// ═══════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING (Basic)
// ═══════════════════════════════════════════════════

export function highlightCode(
  code: string,
  language: string,
): Array<{ text: string; color?: string }> {
  // Basic syntax highlighting - returns array of text segments with colors
  // This is a simplified version; full highlighting would require a proper parser

  const keywords: Record<string, string[]> = {
    javascript: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'import',
      'export',
      'from',
      'async',
      'await',
    ],
    typescript: [
      'const',
      'let',
      'var',
      'function',
      'return',
      'if',
      'else',
      'for',
      'while',
      'class',
      'import',
      'export',
      'from',
      'async',
      'await',
      'interface',
      'type',
      'enum',
    ],
    python: [
      'def',
      'class',
      'if',
      'else',
      'elif',
      'for',
      'while',
      'return',
      'import',
      'from',
      'as',
      'try',
      'except',
      'with',
      'lambda',
      'async',
      'await',
    ],
    java: [
      'public',
      'private',
      'protected',
      'class',
      'interface',
      'extends',
      'implements',
      'return',
      'if',
      'else',
      'for',
      'while',
      'new',
      'static',
      'final',
    ],
  };

  const langKeywords = keywords[language.toLowerCase()] || [];

  // Simple tokenization
  const segments: Array<{ text: string; color?: string }> = [];
  let remaining = code;

  while (remaining.length > 0) {
    let matched = false;

    // Check for keywords
    for (const keyword of langKeywords) {
      const regex = new RegExp(`^\\b${keyword}\\b`);
      const match = remaining.match(regex);
      if (match) {
        segments.push({ text: keyword, color: '0000FF' }); // Blue for keywords
        remaining = remaining.slice(keyword.length);
        matched = true;
        break;
      }
    }

    // Check for strings
    if (!matched) {
      const stringMatch = remaining.match(/^(['"`]).*?\1/);
      if (stringMatch) {
        segments.push({ text: stringMatch[0], color: 'A31515' }); // Red for strings
        remaining = remaining.slice(stringMatch[0].length);
        matched = true;
      }
    }

    // Check for comments
    if (!matched) {
      const commentMatch = remaining.match(/^\/\/.*/);
      if (commentMatch) {
        segments.push({ text: commentMatch[0], color: '008000' }); // Green for comments
        remaining = remaining.slice(commentMatch[0].length);
        matched = true;
      }
    }

    // Check for numbers
    if (!matched) {
      const numberMatch = remaining.match(/^\d+\.?\d*/);
      if (numberMatch) {
        segments.push({ text: numberMatch[0], color: '098658' }); // Teal for numbers
        remaining = remaining.slice(numberMatch[0].length);
        matched = true;
      }
    }

    // Default: take one character
    if (!matched) {
      segments.push({ text: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return segments;
}
