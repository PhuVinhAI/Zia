/**
 * Box Builder - Tạo các loại box/container trong Word
 */

import { AlignmentType, BorderStyle, Paragraph, ShadingType, TextRun } from 'docx';
import type { DocumentTheme } from './types.js';
import { getTheme } from './themes.js';

// ═══════════════════════════════════════════════════
// BOX TYPES
// ═══════════════════════════════════════════════════

export type BoxType = 'default' | 'info' | 'success' | 'warning' | 'error' | 'note' | 'quote' | 'code';

export interface BoxConfig {
  type: BoxType;
  title?: string;
  content: string;
  icon?: string;
}

// ═══════════════════════════════════════════════════
// BOX STYLES
// ═══════════════════════════════════════════════════

const BOX_STYLES: Record<BoxType, { bg: string; border: string; icon: string; titleColor: string }> = {
  default: { bg: 'F5F5F5', border: 'BDBDBD', icon: '📋', titleColor: '424242' },
  info: { bg: 'E3F2FD', border: '2196F3', icon: 'ℹ️', titleColor: '1565C0' },
  success: { bg: 'E8F5E9', border: '4CAF50', icon: '✅', titleColor: '2E7D32' },
  warning: { bg: 'FFF8E1', border: 'FFC107', icon: '⚠️', titleColor: 'F57F17' },
  error: { bg: 'FFEBEE', border: 'F44336', icon: '❌', titleColor: 'C62828' },
  note: { bg: 'F3E5F5', border: '9C27B0', icon: '📝', titleColor: '7B1FA2' },
  quote: { bg: 'ECEFF1', border: '607D8B', icon: '💬', titleColor: '455A64' },
  code: { bg: 'FAFAFA', border: '9E9E9E', icon: '💻', titleColor: '616161' },
};

// ═══════════════════════════════════════════════════
// BOX BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build box paragraphs
 */
export function buildBox(config: BoxConfig, theme?: DocumentTheme): Paragraph[] {
  const t = theme || getTheme();
  const style = BOX_STYLES[config.type];
  const paragraphs: Paragraph[] = [];

  const borderConfig = {
    style: BorderStyle.SINGLE,
    size: 12,
    color: style.border,
  };

  // Title paragraph (if provided)
  if (config.title) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${config.icon || style.icon} ${config.title}`,
            bold: true,
            font: t.fonts.heading,
            size: 24,
            color: style.titleColor,
          }),
        ],
        shading: { type: ShadingType.SOLID, color: style.bg },
        border: {
          top: borderConfig,
          left: borderConfig,
          right: borderConfig,
        },
        spacing: { before: 200 },
        indent: { left: 200, right: 200 },
      })
    );
  }

  // Content paragraph
  const contentLines = config.content.split('\n');
  contentLines.forEach((line, index) => {
    const isFirst = index === 0 && !config.title;
    const isLast = index === contentLines.length - 1;

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: config.type === 'code' ? t.fonts.code : t.fonts.body,
            size: config.type === 'code' ? 20 : 22,
            color: t.colors.text,
          }),
        ],
        shading: { type: ShadingType.SOLID, color: style.bg },
        border: {
          top: isFirst ? borderConfig : undefined,
          bottom: isLast ? borderConfig : undefined,
          left: borderConfig,
          right: borderConfig,
        },
        spacing: { after: isLast ? 200 : 60 },
        indent: { left: 200, right: 200 },
      })
    );
  });

  return paragraphs;
}

/**
 * Parse box syntax từ content
 * Syntax:
 * [BOX:type:title]
 * content
 * [/BOX]
 */
export function parseBoxSyntax(content: string): {
  beforeBox: string;
  boxes: BoxConfig[];
  afterBox: string;
} {
  const result = {
    beforeBox: '',
    boxes: [] as BoxConfig[],
    afterBox: '',
  };

  const boxRegex = /\[BOX:(\w+)(?::([^\]]+))?\]([\s\S]*?)\[\/BOX\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boxRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      if (result.boxes.length === 0) {
        result.beforeBox += content.slice(lastIndex, match.index);
      }
    }

    const boxType = match[1].toLowerCase() as BoxType;
    if (BOX_STYLES[boxType]) {
      result.boxes.push({
        type: boxType,
        title: match[2]?.trim(),
        content: match[3].trim(),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    result.afterBox = content.slice(lastIndex);
  } else if (lastIndex === 0) {
    result.beforeBox = content;
  }

  return result;
}

/**
 * Build simple bordered box
 */
export function buildSimpleBox(
  content: string,
  borderColor?: string,
  bgColor?: string,
  theme?: DocumentTheme
): Paragraph {
  const t = theme || getTheme();

  return new Paragraph({
    children: [
      new TextRun({
        text: content,
        font: t.fonts.body,
        color: t.colors.text,
      }),
    ],
    shading: bgColor ? { type: ShadingType.SOLID, color: bgColor } : undefined,
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: borderColor || t.colors.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: borderColor || t.colors.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 6, color: borderColor || t.colors.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 6, color: borderColor || t.colors.tableBorder },
    },
    spacing: { before: 120, after: 120 },
    indent: { left: 200, right: 200 },
  });
}

/**
 * Check if content contains box syntax
 */
export function hasBoxSyntax(content: string): boolean {
  return /\[BOX:\w+[^\]]*\][\s\S]*?\[\/BOX\]/i.test(content);
}
