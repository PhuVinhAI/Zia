/**
 * Style Builder - Tạo document styles cho Word
 */

import { AlignmentType, UnderlineType } from 'docx';
import { FONT_SIZES } from './constants.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// DOCUMENT STYLES
// ═══════════════════════════════════════════════════

export function buildDocumentStyles(theme: DocumentTheme) {
  return {
    default: {
      document: {
        run: {
          font: theme.fonts.body,
          size: FONT_SIZES.body,
          color: theme.colors.text,
        },
        paragraph: {
          spacing: {
            after: theme.spacing.paragraphAfter,
            line: theme.spacing.lineSpacing,
          },
        },
      },
      heading1: {
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.heading1,
          bold: true,
          color: theme.colors.heading,
        },
        paragraph: {
          spacing: {
            before: theme.spacing.headingBefore,
            after: theme.spacing.headingAfter,
          },
        },
      },
      heading2: {
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.heading2,
          bold: true,
          color: theme.colors.heading,
        },
        paragraph: {
          spacing: {
            before: theme.spacing.headingBefore,
            after: theme.spacing.headingAfter,
          },
        },
      },
      heading3: {
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.heading3,
          bold: true,
          color: theme.colors.heading,
        },
        paragraph: {
          spacing: {
            before: theme.spacing.headingBefore - 40,
            after: theme.spacing.headingAfter - 20,
          },
        },
      },
      heading4: {
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.heading4,
          bold: true,
          color: theme.colors.heading,
        },
        paragraph: {
          spacing: {
            before: theme.spacing.headingBefore - 80,
            after: theme.spacing.headingAfter - 40,
          },
        },
      },
      listParagraph: {
        run: {
          font: theme.fonts.body,
          size: FONT_SIZES.body,
        },
        paragraph: {
          spacing: {
            after: theme.spacing.listItemAfter,
          },
        },
      },
    },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        next: 'Normal',
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.title,
          bold: true,
          color: theme.colors.primary,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        },
      },
      {
        id: 'Subtitle',
        name: 'Subtitle',
        basedOn: 'Normal',
        next: 'Normal',
        run: {
          font: theme.fonts.heading,
          size: FONT_SIZES.heading3,
          color: theme.colors.secondary,
          italics: true,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        },
      },
      {
        id: 'Quote',
        name: 'Quote',
        basedOn: 'Normal',
        run: {
          font: theme.fonts.body,
          size: FONT_SIZES.body,
          italics: true,
          color: theme.colors.secondary,
        },
        paragraph: {
          indent: { left: 720 },
          spacing: { before: 120, after: 120 },
        },
      },
      {
        id: 'CodeBlock',
        name: 'Code Block',
        basedOn: 'Normal',
        run: {
          font: theme.fonts.code,
          size: FONT_SIZES.code,
        },
        paragraph: {
          spacing: { before: 120, after: 120 },
        },
      },
      {
        id: 'Footnote',
        name: 'Footnote',
        basedOn: 'Normal',
        run: {
          font: theme.fonts.body,
          size: FONT_SIZES.footnote,
          color: theme.colors.secondary,
        },
      },
    ],
    characterStyles: [
      {
        id: 'Hyperlink',
        name: 'Hyperlink',
        run: {
          color: theme.colors.link,
          underline: { type: UnderlineType.SINGLE },
        },
      },
      {
        id: 'InlineCode',
        name: 'Inline Code',
        run: {
          font: theme.fonts.code,
          size: FONT_SIZES.code,
        },
      },
      {
        id: 'Strong',
        name: 'Strong',
        run: {
          bold: true,
        },
      },
      {
        id: 'Emphasis',
        name: 'Emphasis',
        run: {
          italics: true,
        },
      },
    ],
  };
}

// ═══════════════════════════════════════════════════
// NUMBERING CONFIG
// ═══════════════════════════════════════════════════

export function buildNumberingConfig() {
  return {
    config: [
      {
        reference: 'default-numbering',
        levels: [
          {
            level: 0,
            format: 'decimal' as const,
            text: '%1.',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1,
            format: 'lowerLetter' as const,
            text: '%2)',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
          },
          {
            level: 2,
            format: 'lowerRoman' as const,
            text: '%3.',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
          },
          {
            level: 3,
            format: 'decimal' as const,
            text: '%4.',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 2880, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'bullet-list',
        levels: [
          {
            level: 0,
            format: 'bullet' as const,
            text: '•',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1,
            format: 'bullet' as const,
            text: '○',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
          },
          {
            level: 2,
            format: 'bullet' as const,
            text: '■',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 2160, hanging: 360 } } },
          },
          {
            level: 3,
            format: 'bullet' as const,
            text: '–',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 2880, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'checklist',
        levels: [
          {
            level: 0,
            format: 'bullet' as const,
            text: '☐',
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  };
}
