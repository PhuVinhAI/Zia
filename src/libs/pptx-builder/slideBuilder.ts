/**
 * Slide Builder - Xây dựng các loại slide
 */

import { buildCodeBlock } from './codeBuilder.js';
import { FONT_SIZES } from './constants.js';
import { buildImage } from './imageBuilder.js';
import { getMasterForSlideType } from './masterSlide.js';
import { buildTable } from './tableBuilder.js';
import type { ParsedSlide, PresentationTheme } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/**
 * Calculate font size based on text length to prevent line wrapping
 * Uses approximate character width to fit text in single line
 * Slide width ~9 inches, average char width at font size 1pt ~0.05 inches
 */
function calculateTitleFontSize(text: string, maxSize: number, minSize: number = 14): number {
  const len = text.length;
  const slideWidth = 9.0; // inches
  const charWidthFactor = 0.55; // approximate width per character per point of font size

  // Calculate max font size that fits in one line
  // Formula: slideWidth = len * (fontSize * charWidthFactor / 72)
  // fontSize = (slideWidth * 72) / (len * charWidthFactor)
  const calculatedSize = Math.floor((slideWidth * 72) / (len * charWidthFactor));

  // Clamp between minSize and maxSize
  return Math.max(minSize, Math.min(maxSize, calculatedSize));
}

// ═══════════════════════════════════════════════════
// MAIN SLIDE BUILDER
// ═══════════════════════════════════════════════════

export function buildSlide(
  pptx: any,
  slideData: ParsedSlide,
  index: number,
  theme: PresentationTheme,
  showSlideNumbers: boolean = true,
): void {
  const masterName = getMasterForSlideType(slideData.type);
  const slide = pptx.addSlide({ masterName });

  // Build slide based on type
  switch (slideData.type) {
    case 'title':
      buildTitleSlide(slide, slideData, theme);
      break;
    case 'section':
      buildSectionSlide(slide, slideData, theme);
      break;
    case 'imageOnly':
      buildImageSlide(slide, slideData, theme);
      break;
    case 'quote':
      buildQuoteSlide(slide, slideData, theme);
      break;
    case 'thankyou':
      buildThankYouSlide(slide, slideData, theme);
      break;
    case 'blank':
      // No content
      break;
    default:
      buildContentSlide(slide, slideData, theme);
  }

  // Add slide number
  if (showSlideNumbers) {
    addSlideNumber(slide, index + 1, theme);
  }

}

// ═══════════════════════════════════════════════════
// TITLE SLIDE
// ═══════════════════════════════════════════════════

function buildTitleSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  // Main title with auto-sizing
  if (data.title) {
    const titleFontSize = calculateTitleFontSize(data.title, FONT_SIZES.titleSlide);
    slide.addText(data.title, {
      x: 0.5,
      y: 1.8,
      w: '90%',
      h: 1.8,
      fontSize: titleFontSize,
      bold: true,
      color: theme.colors.titleText,
      fontFace: theme.fonts.title,
      align: 'center',
      valign: 'middle',
      shrinkText: true, // Auto shrink if too long
    });
  }

  // Subtitle
  if (data.subtitle) {
    const subtitleFontSize = calculateTitleFontSize(data.subtitle, FONT_SIZES.subtitle, 16);
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.6,
      w: '90%',
      h: 0.8,
      fontSize: subtitleFontSize,
      color: theme.colors.bodyText,
      fontFace: theme.fonts.subtitle,
      align: 'center',
      valign: 'middle',
    });
  }

  // Additional info from bullets (author, date, etc.)
  if (data.bullets.length > 0) {
    const infoText = data.bullets.map((b) => b.text).join(' | ');
    slide.addText(infoText, {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.5,
      fontSize: FONT_SIZES.body,
      color: lightenColor(theme.colors.bodyText, 30),
      fontFace: theme.fonts.body,
      align: 'center',
    });
  }
}

// ═══════════════════════════════════════════════════
// SECTION SLIDE
// ═══════════════════════════════════════════════════

function buildSectionSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  // Section title (white text on primary background)
  if (data.title) {
    const fontSize = calculateTitleFontSize(data.title, FONT_SIZES.sectionTitle, 28);
    slide.addText(data.title, {
      x: 0.5,
      y: 2.2,
      w: '90%',
      h: 1.2,
      fontSize,
      bold: true,
      color: 'FFFFFF',
      fontFace: theme.fonts.title,
      align: 'left',
      valign: 'middle',
      shrinkText: true,
    });
  }

  // Section subtitle (white text, slightly lighter)
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.4,
      w: '90%',
      h: 0.6,
      fontSize: FONT_SIZES.subtitle,
      color: 'E0E0E0',
      fontFace: theme.fonts.subtitle,
      align: 'left',
    });
  }
}

// ═══════════════════════════════════════════════════
// CONTENT SLIDE
// ═══════════════════════════════════════════════════

function buildContentSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  let currentY = 0.5;

  // Title with auto-sizing
  if (data.title) {
    const fontSize = calculateTitleFontSize(data.title, FONT_SIZES.title, 24);
    slide.addText(data.title, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 1.0,
      fontSize,
      bold: true,
      color: theme.colors.titleText,
      fontFace: theme.fonts.title,
      shrinkText: true,
    });
    currentY = 1.6;
  }

  // Subtitle
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 0.5,
      fontSize: FONT_SIZES.subheading,
      color: lightenColor(theme.colors.bodyText, 20),
      fontFace: theme.fonts.subtitle,
    });
    currentY += 0.6;
  }

  // Bullets
  if (data.bullets.length > 0) {
    const bulletItems = data.bullets.map((bullet) => ({
      text: formatBulletText(bullet.text, bullet.checked),
      options: {
        bullet: bullet.checked !== undefined ? false : true,
        indentLevel: bullet.level,
        bold: bullet.styles.includes('bold'),
        italic: bullet.styles.includes('italic'),
        breakLine: true,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 3.5,
      fontSize: FONT_SIZES.bullet,
      color: theme.colors.bodyText,
      fontFace: theme.fonts.body,
      valign: 'top',
      paraSpaceAfter: theme.spacing.bulletSpacing,
    });
    currentY += 3.5;
  }

  // Numbered list
  if (data.numberedItems.length > 0) {
    const numberedItems = data.numberedItems.map((text, i) => ({
      text: `${i + 1}. ${text}`,
      options: {
        indentLevel: 0,
        breakLine: true,
      },
    }));

    slide.addText(numberedItems, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 2.5,
      fontSize: FONT_SIZES.bullet,
      color: theme.colors.bodyText,
      fontFace: theme.fonts.body,
      valign: 'top',
      paraSpaceAfter: theme.spacing.bulletSpacing,
    });
    currentY += 2.5;
  }

  // Code blocks
  if (data.codeBlocks.length > 0) {
    for (const codeBlock of data.codeBlocks) {
      buildCodeBlock(slide, codeBlock, currentY, theme);
      currentY += 2.0;
    }
  }

  // Table
  if (data.table) {
    buildTable(slide, data.table, currentY, theme);
  }

  // Images
  if (data.images.length > 0) {
    for (const image of data.images) {
      buildImage(slide, image, theme);
    }
  }
}

// ═══════════════════════════════════════════════════
// IMAGE SLIDE
// ═══════════════════════════════════════════════════

function buildImageSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  // Title
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.8,
      fontSize: FONT_SIZES.heading,
      bold: true,
      color: theme.colors.titleText,
      fontFace: theme.fonts.title,
    });
  }

  // Images
  for (const image of data.images) {
    buildImage(slide, image, theme, true); // Large image mode
  }
}

// ═══════════════════════════════════════════════════
// QUOTE SLIDE
// ═══════════════════════════════════════════════════

function buildQuoteSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  if (data.quote) {
    // Quote text
    slide.addText(`"${data.quote.text}"`, {
      x: 1.0,
      y: 1.5,
      w: '80%',
      h: 2.5,
      fontSize: 28,
      italic: true,
      color: theme.colors.bodyText,
      fontFace: 'Georgia',
      align: 'center',
      valign: 'middle',
    });

    // Author
    if (data.quote.author) {
      slide.addText(`— ${data.quote.author}`, {
        x: 1.0,
        y: 4.2,
        w: '80%',
        h: 0.5,
        fontSize: FONT_SIZES.body,
        color: lightenColor(theme.colors.bodyText, 30),
        fontFace: theme.fonts.body,
        align: 'right',
      });
    }

    // Source
    if (data.quote.source) {
      slide.addText(data.quote.source, {
        x: 1.0,
        y: 4.7,
        w: '80%',
        h: 0.4,
        fontSize: FONT_SIZES.caption,
        italic: true,
        color: lightenColor(theme.colors.bodyText, 50),
        fontFace: theme.fonts.body,
        align: 'right',
      });
    }
  }
}

// ═══════════════════════════════════════════════════
// THANK YOU SLIDE
// ═══════════════════════════════════════════════════

function buildThankYouSlide(slide: any, data: ParsedSlide, theme: PresentationTheme): void {
  // Main text
  const mainText = data.title || 'Thank You!';
  slide.addText(mainText, {
    x: 0.5,
    y: 2.0,
    w: '90%',
    h: 1.5,
    fontSize: FONT_SIZES.titleSlide,
    bold: true,
    color: 'FFFFFF',
    fontFace: theme.fonts.title,
    align: 'center',
    valign: 'middle',
  });

  // Subtitle/contact info
  if (data.subtitle || data.bullets.length > 0) {
    const subText = data.subtitle || data.bullets.map((b) => b.text).join('\n');
    slide.addText(subText, {
      x: 0.5,
      y: 3.8,
      w: '90%',
      h: 1.0,
      fontSize: FONT_SIZES.body,
      color: 'E0E0E0',
      fontFace: theme.fonts.body,
      align: 'center',
    });
  }
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function formatBulletText(text: string, checked?: boolean): string {
  if (checked === undefined) return text;
  return checked ? `✓ ${text}` : `☐ ${text}`;
}

function addSlideNumber(slide: any, number: number, theme: PresentationTheme): void {
  slide.addText(String(number), {
    x: '92%',
    y: '95.5%',
    w: 0.5,
    h: 0.25,
    fontSize: FONT_SIZES.pageNumber,
    color: 'FFFFFF',
    fontFace: theme.fonts.body,
    align: 'center',
  });
}
