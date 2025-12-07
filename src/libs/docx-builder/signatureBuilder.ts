/**
 * Signature Builder - Tạo signature blocks cho documents
 */

import { AlignmentType, BorderStyle, Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// SIGNATURE TYPES
// ═══════════════════════════════════════════════════

export interface SignatureConfig {
  name: string;
  title?: string;
  company?: string;
  date?: string;
  showLine?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

export interface MultiSignatureConfig {
  signatures: SignatureConfig[];
  layout: 'horizontal' | 'vertical';
}

// ═══════════════════════════════════════════════════
// SIGNATURE BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build signature block
 */
export function buildSignatureBlock(config: SignatureConfig, theme?: DocumentTheme): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];
  const alignment =
    config.alignment === 'left'
      ? AlignmentType.LEFT
      : config.alignment === 'right'
        ? AlignmentType.RIGHT
        : AlignmentType.CENTER;

  // Spacing before signature
  paragraphs.push(
    new Paragraph({
      spacing: { before: 600 },
    }),
  );

  // Signature line
  if (config.showLine !== false) {
    paragraphs.push(
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: '________________________________',
            font: t.fonts.body,
            color: t.colors.text,
          }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  // Name
  paragraphs.push(
    new Paragraph({
      alignment,
      children: [
        new TextRun({
          text: config.name,
          bold: true,
          font: t.fonts.body,
          size: 24,
          color: t.colors.text,
        }),
      ],
      spacing: { after: 40 },
    }),
  );

  // Title
  if (config.title) {
    paragraphs.push(
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: config.title,
            font: t.fonts.body,
            size: 22,
            color: t.colors.secondary,
          }),
        ],
        spacing: { after: 40 },
      }),
    );
  }

  // Company
  if (config.company) {
    paragraphs.push(
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: config.company,
            italics: true,
            font: t.fonts.body,
            size: 22,
            color: t.colors.secondary,
          }),
        ],
        spacing: { after: 40 },
      }),
    );
  }

  // Date
  if (config.date) {
    paragraphs.push(
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: `Ngày: ${config.date}`,
            font: t.fonts.body,
            size: 20,
            color: t.colors.secondary,
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

/**
 * Build approval block (Người duyệt / Người lập)
 */
export function buildApprovalBlock(
  approver: SignatureConfig,
  creator: SignatureConfig,
  theme?: DocumentTheme,
): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];

  // Header row
  paragraphs.push(
    new Paragraph({
      spacing: { before: 600 },
    }),
  );

  // Two-column signature using tabs
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'NGƯỜI DUYỆT',
          bold: true,
          font: t.fonts.body,
          size: 22,
          color: t.colors.heading,
        }),
        new TextRun({
          text: '\t\t\t\t\t',
        }),
        new TextRun({
          text: 'NGƯỜI LẬP',
          bold: true,
          font: t.fonts.body,
          size: 22,
          color: t.colors.heading,
        }),
      ],
      spacing: { after: 400 },
    }),
  );

  // Signature lines
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '________________________',
          font: t.fonts.body,
        }),
        new TextRun({
          text: '\t\t\t',
        }),
        new TextRun({
          text: '________________________',
          font: t.fonts.body,
        }),
      ],
      spacing: { after: 80 },
    }),
  );

  // Names
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: approver.name,
          bold: true,
          font: t.fonts.body,
          size: 22,
        }),
        new TextRun({
          text: '\t\t\t\t',
        }),
        new TextRun({
          text: creator.name,
          bold: true,
          font: t.fonts.body,
          size: 22,
        }),
      ],
      spacing: { after: 40 },
    }),
  );

  // Titles
  if (approver.title || creator.title) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: approver.title || '',
            font: t.fonts.body,
            size: 20,
            color: t.colors.secondary,
          }),
          new TextRun({
            text: '\t\t\t\t',
          }),
          new TextRun({
            text: creator.title || '',
            font: t.fonts.body,
            size: 20,
            color: t.colors.secondary,
          }),
        ],
      }),
    );
  }

  return paragraphs;
}

/**
 * Parse signature syntax
 * Syntax: [SIGNATURE:name:title:company:date]
 */
export function parseSignatureSyntax(line: string): SignatureConfig | null {
  const match = line
    .trim()
    .match(/^\[SIGNATURE:([^:\]]+)(?::([^:\]]+))?(?::([^:\]]+))?(?::([^\]]+))?\]$/i);
  if (!match) return null;

  return {
    name: match[1].trim(),
    title: match[2]?.trim(),
    company: match[3]?.trim(),
    date: match[4]?.trim(),
  };
}

/**
 * Parse approval block syntax
 * Syntax: [APPROVAL:approverName:approverTitle|creatorName:creatorTitle]
 */
export function parseApprovalSyntax(
  line: string,
): { approver: SignatureConfig; creator: SignatureConfig } | null {
  const match = line.trim().match(/^\[APPROVAL:([^|]+)\|([^\]]+)\]$/i);
  if (!match) return null;

  const approverParts = match[1].split(':').map((s) => s.trim());
  const creatorParts = match[2].split(':').map((s) => s.trim());

  return {
    approver: {
      name: approverParts[0] || 'Người duyệt',
      title: approverParts[1],
    },
    creator: {
      name: creatorParts[0] || 'Người lập',
      title: creatorParts[1],
    },
  };
}

/**
 * Check if line is signature syntax
 */
export function isSignatureSyntax(line: string): boolean {
  const trimmed = line.trim();
  return /^\[SIGNATURE:[^\]]+\]$/i.test(trimmed) || /^\[APPROVAL:[^\]]+\]$/i.test(trimmed);
}
