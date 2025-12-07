/**
 * Badge Builder - Tạo badges/tags trong Word
 */

import { BorderStyle, Paragraph, ShadingType, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// BADGE TYPES
// ═══════════════════════════════════════════════════

export interface BadgeConfig {
  text: string;
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  customColor?: string;
  customBgColor?: string;
}

// ═══════════════════════════════════════════════════
// BADGE COLORS
// ═══════════════════════════════════════════════════

const BADGE_COLORS = {
  default: { bg: 'E0E0E0', text: '424242' },
  primary: { bg: '2196F3', text: 'FFFFFF' },
  success: { bg: '4CAF50', text: 'FFFFFF' },
  warning: { bg: 'FF9800', text: '000000' },
  danger: { bg: 'F44336', text: 'FFFFFF' },
  info: { bg: '00BCD4', text: 'FFFFFF' },
};

// ═══════════════════════════════════════════════════
// BADGE BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build badge TextRun
 */
export function buildBadgeRun(config: BadgeConfig, theme?: DocumentTheme): TextRun {
  const t = theme || getTheme();
  const colors = BADGE_COLORS[config.type || 'default'];

  return new TextRun({
    text: ` ${config.text} `,
    font: t.fonts.body,
    size: 18,
    color: config.customColor || colors.text,
    shading: {
      type: ShadingType.SOLID,
      color: config.customBgColor || colors.bg,
    },
    bold: true,
  });
}

/**
 * Build badge paragraph
 */
export function buildBadgeParagraph(badges: BadgeConfig[], theme?: DocumentTheme): Paragraph {
  const children: TextRun[] = [];

  for (let i = 0; i < badges.length; i++) {
    children.push(buildBadgeRun(badges[i], theme));
    if (i < badges.length - 1) {
      children.push(new TextRun({ text: ' ' }));
    }
  }

  return new Paragraph({
    children,
    spacing: { after: 120 },
  });
}

/**
 * Parse badge syntax từ text
 * Syntax: [BADGE:text:type] hoặc [BADGE:text]
 */
export function parseBadges(text: string): BadgeConfig[] {
  const badges: BadgeConfig[] = [];
  const regex = /\[BADGE:([^:\]]+)(?::([^\]]+))?\]/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    badges.push({
      text: match[1].trim(),
      type: (match[2]?.trim() as BadgeConfig['type']) || 'default',
    });
  }

  return badges;
}

/**
 * Check if line contains badges
 */
export function hasBadges(text: string): boolean {
  return /\[BADGE:[^\]]+\]/i.test(text);
}

/**
 * Remove badge syntax từ text
 */
export function removeBadgeSyntax(text: string): string {
  return text.replace(/\[BADGE:[^\]]+\]/gi, '').trim();
}
