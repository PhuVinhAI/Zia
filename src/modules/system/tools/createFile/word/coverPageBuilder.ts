/**
 * Cover Page Builder - Tạo trang bìa cho documents
 */

import { AlignmentType, PageBreak, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// COVER PAGE TYPES
// ═══════════════════════════════════════════════════

export interface CoverPageConfig {
  title: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  date?: string;
  version?: string;
  logo?: string; // Base64 or URL
  style?: 'simple' | 'professional' | 'academic' | 'modern';
}

// ═══════════════════════════════════════════════════
// COVER PAGE BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build cover page paragraphs
 */
export function buildCoverPage(config: CoverPageConfig, theme?: DocumentTheme): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];
  const style = config.style || 'simple';

  // Top spacing
  paragraphs.push(
    new Paragraph({
      spacing: { before: 2000 },
    }),
  );

  // Organization (if provided)
  if (config.organization) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: config.organization.toUpperCase(),
            font: t.fonts.heading,
            size: 28,
            color: t.colors.secondary,
            bold: style === 'professional',
          }),
        ],
        spacing: { after: 400 },
      }),
    );
  }

  // Decorative line (for professional/modern styles)
  if (style === 'professional' || style === 'modern') {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: style === 'modern' ? '━━━━━━━━━━━━━━━━━━━━' : '═══════════════════════════',
            color: t.colors.primary,
            size: 24,
          }),
        ],
        spacing: { after: 600 },
      }),
    );
  }

  // Main title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: config.title,
          font: t.fonts.heading,
          size: style === 'academic' ? 56 : 72,
          bold: true,
          color: t.colors.primary,
        }),
      ],
      spacing: { after: 400, line: 360 },
    }),
  );

  // Subtitle
  if (config.subtitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: config.subtitle,
            font: t.fonts.heading,
            size: 36,
            color: t.colors.secondary,
            italics: style === 'academic',
          }),
        ],
        spacing: { before: 200, after: 600, line: 300 },
      }),
    );
  }

  // Decorative element
  if (style === 'modern') {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '◆',
            size: 36,
            color: t.colors.accent,
          }),
        ],
        spacing: { after: 600 },
      }),
    );
  }

  // Version (if provided)
  if (config.version) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Phiên bản: ${config.version}`,
            font: t.fonts.body,
            size: 24,
            color: t.colors.secondary,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  // Large spacing before author/date
  paragraphs.push(
    new Paragraph({
      spacing: { before: 2000 },
    }),
  );

  // Author
  if (config.author) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: style === 'academic' ? `Tác giả: ${config.author}` : config.author,
            font: t.fonts.body,
            size: 28,
            color: t.colors.text,
            bold: style !== 'academic',
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  // Date
  if (config.date) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: config.date,
            font: t.fonts.body,
            size: 24,
            color: t.colors.secondary,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  // Page break after cover
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  );

  return paragraphs;
}

/**
 * Build simple title page (không có page break)
 */
export function buildTitleBlock(
  title: string,
  subtitle?: string,
  theme?: DocumentTheme,
): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: title,
          font: t.fonts.heading,
          size: 56,
          bold: true,
          color: t.colors.primary,
        }),
      ],
      spacing: { before: 400, after: 400, line: 340 },
    }),
  );

  if (subtitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: subtitle,
            font: t.fonts.heading,
            size: 32,
            color: t.colors.secondary,
            italics: true,
          }),
        ],
        spacing: { before: 200, after: 400, line: 300 },
      }),
    );
  }

  return paragraphs;
}

/**
 * Parse cover page syntax
 * Syntax: [COVER:title:subtitle:author:org:date:version:style]
 */
export function parseCoverPageSyntax(content: string): CoverPageConfig | null {
  const match = content.match(/\[COVER:([^\]]+)\]/i);
  if (!match) return null;

  const parts = match[1].split(':').map((s) => s.trim());

  return {
    title: parts[0] || 'Untitled',
    subtitle: parts[1] || undefined,
    author: parts[2] || undefined,
    organization: parts[3] || undefined,
    date: parts[4] || undefined,
    version: parts[5] || undefined,
    style: (parts[6] as CoverPageConfig['style']) || 'simple',
  };
}

/**
 * Remove cover page syntax từ content
 */
export function removeCoverPageSyntax(content: string): string {
  return content.replace(/\[COVER:[^\]]+\]/gi, '').trim();
}

/**
 * Check if content has cover page syntax
 */
export function hasCoverPageSyntax(content: string): boolean {
  return /\[COVER:[^\]]+\]/i.test(content);
}
