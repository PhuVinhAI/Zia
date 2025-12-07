/**
 * Word Document Constants - Các hằng số cho Word framework
 */

import { AlignmentType, convertMillimetersToTwip, HeadingLevel, PageOrientation } from 'docx';

// ═══════════════════════════════════════════════════
// PAGE SIZES (in mm)
// ═══════════════════════════════════════════════════

export const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
} as const;

export function getPageSize(size: 'A4' | 'Letter' | 'Legal' = 'A4') {
  const dimensions = PAGE_SIZES[size];
  return {
    width: convertMillimetersToTwip(dimensions.width),
    height: convertMillimetersToTwip(dimensions.height),
  };
}

// ═══════════════════════════════════════════════════
// DEFAULT MARGINS (in mm)
// ═══════════════════════════════════════════════════

export const DEFAULT_MARGINS = {
  top: 25.4, // 1 inch
  bottom: 25.4,
  left: 25.4,
  right: 25.4,
};

/**
 * Get margins - supports both mm and twips
 * If value > 100, assume it's already in twips (1 inch = 1440 twips)
 * Otherwise, treat as mm and convert to twips
 */
export function getMargins(margins?: {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}) {
  const convertValue = (value: number | undefined, defaultMm: number): number => {
    if (value === undefined) {
      return convertMillimetersToTwip(defaultMm);
    }
    // If value > 100, assume it's already in twips (typical mm values are < 100)
    // 1440 twips = 1 inch, typical margins are 720-1440 twips
    return value > 100 ? value : convertMillimetersToTwip(value);
  };

  return {
    top: convertValue(margins?.top, DEFAULT_MARGINS.top),
    bottom: convertValue(margins?.bottom, DEFAULT_MARGINS.bottom),
    left: convertValue(margins?.left, DEFAULT_MARGINS.left),
    right: convertValue(margins?.right, DEFAULT_MARGINS.right),
  };
}

// ═══════════════════════════════════════════════════
// HEADING LEVELS MAPPING
// ═══════════════════════════════════════════════════

export const HEADING_LEVELS = {
  heading1: HeadingLevel.HEADING_1,
  heading2: HeadingLevel.HEADING_2,
  heading3: HeadingLevel.HEADING_3,
  heading4: HeadingLevel.HEADING_4,
  heading5: HeadingLevel.HEADING_5,
  heading6: HeadingLevel.HEADING_6,
} as const;

// ═══════════════════════════════════════════════════
// FONT SIZES (in half-points)
// ═══════════════════════════════════════════════════

export const FONT_SIZES = {
  title: 56, // 28pt
  heading1: 48, // 24pt
  heading2: 40, // 20pt
  heading3: 32, // 16pt
  heading4: 28, // 14pt
  heading5: 24, // 12pt
  heading6: 22, // 11pt
  body: 24, // 12pt
  small: 20, // 10pt
  code: 20, // 10pt
  footnote: 18, // 9pt
} as const;

// ═══════════════════════════════════════════════════
// ALIGNMENT MAPPING
// ═══════════════════════════════════════════════════

export const ALIGNMENTS = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const;

// ═══════════════════════════════════════════════════
// ORIENTATION MAPPING
// ═══════════════════════════════════════════════════

export const ORIENTATIONS = {
  portrait: PageOrientation.PORTRAIT,
  landscape: PageOrientation.LANDSCAPE,
} as const;

// ═══════════════════════════════════════════════════
// CALLOUT STYLES
// ═══════════════════════════════════════════════════

export const CALLOUT_STYLES = {
  info: {
    icon: 'ℹ️',
    backgroundColor: 'E7F3FF',
    borderColor: '2196F3',
    textColor: '0D47A1',
  },
  warning: {
    icon: '⚠️',
    backgroundColor: 'FFF8E1',
    borderColor: 'FFC107',
    textColor: 'F57F17',
  },
  success: {
    icon: '✅',
    backgroundColor: 'E8F5E9',
    borderColor: '4CAF50',
    textColor: '1B5E20',
  },
  error: {
    icon: '❌',
    backgroundColor: 'FFEBEE',
    borderColor: 'F44336',
    textColor: 'B71C1C',
  },
} as const;

// ═══════════════════════════════════════════════════
// NUMBERING FORMATS
// ═══════════════════════════════════════════════════

export const NUMBERING_FORMATS = {
  decimal: 'decimal',
  lowerLetter: 'lowerLetter',
  upperLetter: 'upperLetter',
  lowerRoman: 'lowerRoman',
  upperRoman: 'upperRoman',
} as const;
