/**
 * Header & Footer Builder - Tạo header/footer cho Word document
 */

import { Footer, Header, PageNumber, Paragraph, TextRun } from 'docx';
import { ALIGNMENTS } from './constants.js';
import { getTheme } from './themes.js';
import type { DocumentTheme, HeaderFooterConfig } from './types.js';

// ═══════════════════════════════════════════════════
// HEADER BUILDER
// ═══════════════════════════════════════════════════

export function buildHeader(config: HeaderFooterConfig, theme?: DocumentTheme): Header {
  const t = theme || getTheme();
  const alignment = ALIGNMENTS[config.alignment || 'center'];

  const children: TextRun[] = [];

  if (config.text) {
    children.push(
      new TextRun({
        text: config.text,
        font: t.fonts.body,
        size: 20,
        color: t.colors.secondary,
      }),
    );
  }

  if (config.includePageNumber) {
    if (config.text) {
      children.push(new TextRun({ text: ' | ', color: t.colors.secondary }));
    }
    children.push(
      new TextRun({
        children: ['Trang ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
        font: t.fonts.body,
        size: 20,
        color: t.colors.secondary,
      }),
    );
  }

  return new Header({
    children: [
      new Paragraph({
        alignment,
        children,
        border: {
          bottom: {
            style: 'single',
            size: 6,
            color: t.colors.tableBorder,
          },
        },
        spacing: { after: 200 },
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════
// FOOTER BUILDER
// ═══════════════════════════════════════════════════

export function buildFooter(config: HeaderFooterConfig, theme?: DocumentTheme): Footer {
  const t = theme || getTheme();
  const alignment = ALIGNMENTS[config.alignment || 'center'];

  const children: TextRun[] = [];

  if (config.text) {
    children.push(
      new TextRun({
        text: config.text,
        font: t.fonts.body,
        size: 18,
        color: t.colors.secondary,
      }),
    );
  }

  if (config.includePageNumber) {
    if (config.text) {
      children.push(new TextRun({ text: ' — ', color: t.colors.secondary }));
    }
    children.push(
      new TextRun({
        children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
        font: t.fonts.body,
        size: 18,
        color: t.colors.secondary,
      }),
    );
  }

  return new Footer({
    children: [
      new Paragraph({
        alignment,
        children,
        border: {
          top: {
            style: 'single',
            size: 6,
            color: t.colors.tableBorder,
          },
        },
        spacing: { before: 200 },
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════
// DEFAULT HEADER/FOOTER
// ═══════════════════════════════════════════════════

export function buildDefaultHeader(title?: string, theme?: DocumentTheme): Header {
  return buildHeader(
    {
      text: title || '',
      alignment: 'left',
      includePageNumber: false,
    },
    theme,
  );
}

export function buildDefaultFooter(theme?: DocumentTheme): Footer {
  return buildFooter(
    {
      text: 'Created by Zia AI Bot',
      alignment: 'center',
      includePageNumber: true,
    },
    theme,
  );
}
