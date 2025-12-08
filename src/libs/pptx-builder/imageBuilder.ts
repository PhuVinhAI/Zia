/**
 * Image Builder - Xử lý hình ảnh trong PowerPoint
 */

import { FONT_SIZES } from './constants.js';
import type { ParsedImage, PresentationTheme } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// MAIN IMAGE BUILDER
// ═══════════════════════════════════════════════════

export function buildImage(
  slide: any,
  image: ParsedImage,
  theme: PresentationTheme,
  largeMode: boolean = false,
): void {
  const imageOptions: any = {
    sizing: {
      type: 'contain',
      w: image.width || (largeMode ? 8.0 : 4.0),
      h: image.height || (largeMode ? 4.0 : 3.0),
    },
  };

  // Position
  if (largeMode) {
    imageOptions.x = 1.0;
    imageOptions.y = 1.2;
  } else {
    imageOptions.x = 5.0;
    imageOptions.y = 2.0;
  }

  // Determine image source type
  if (image.src.startsWith('data:')) {
    imageOptions.data = image.src;
  } else if (image.src.startsWith('http://') || image.src.startsWith('https://')) {
    imageOptions.path = image.src;
  } else {
    // Assume base64 without data URI prefix
    imageOptions.data = `data:image/png;base64,${image.src}`;
  }

  slide.addImage(imageOptions);

  // Caption
  if (image.caption) {
    const captionY = largeMode ? 5.0 : imageOptions.y + (image.height || 3.0) + 0.1;
    slide.addText(image.caption, {
      x: imageOptions.x,
      y: captionY,
      w: image.width || (largeMode ? 8.0 : 4.0),
      h: 0.4,
      fontSize: FONT_SIZES.caption,
      italic: true,
      color: lightenColor(theme.colors.bodyText, 30),
      fontFace: theme.fonts.body,
      align: 'center',
    });
  }
}

// ═══════════════════════════════════════════════════
// POSITIONED IMAGE
// ═══════════════════════════════════════════════════

export function buildPositionedImage(
  slide: any,
  imageData: string,
  options: {
    x: number | string;
    y: number | string;
    width: number | string;
    height: number | string;
    caption?: string;
    rounded?: boolean;
    shadow?: boolean;
    border?: { color: string; width: number };
    theme: PresentationTheme;
  },
): void {
  const { x, y, width, height, caption, rounded, shadow, border, theme } = options;

  // If rounded or shadow, add background shape first
  if (rounded || shadow) {
    slide.addShape('roundRect', {
      x,
      y,
      w: width,
      h: height,
      fill: { color: 'FFFFFF' },
      line: border ? { color: border.color, pt: border.width } : { pt: 0 },
      shadow: shadow
        ? { type: 'outer', blur: 4, offset: 2, angle: 45, color: '000000', opacity: 0.2 }
        : undefined,
    });
  }

  const imageOptions: any = {
    x,
    y,
    sizing: { type: 'contain', w: width, h: height },
  };

  if (imageData.startsWith('data:')) {
    imageOptions.data = imageData;
  } else if (imageData.startsWith('http')) {
    imageOptions.path = imageData;
  } else {
    imageOptions.data = `data:image/png;base64,${imageData}`;
  }

  slide.addImage(imageOptions);

  if (caption) {
    const captionY = typeof y === 'number' && typeof height === 'number' ? y + height + 0.1 : y;
    slide.addText(caption, {
      x,
      y: captionY,
      w: width,
      h: 0.35,
      fontSize: FONT_SIZES.caption,
      italic: true,
      color: lightenColor(theme.colors.bodyText, 30),
      fontFace: theme.fonts.body,
      align: 'center',
    });
  }
}

// ═══════════════════════════════════════════════════
// IMAGE GALLERY
// ═══════════════════════════════════════════════════

export function buildImageGallery(
  slide: any,
  images: Array<{ data: string; caption?: string }>,
  theme: PresentationTheme,
  options?: {
    startY?: number;
    columns?: number;
    spacing?: number;
  },
): void {
  const { startY = 1.5, columns = 3, spacing = 0.2 } = options || {};

  const totalWidth = 9.0;
  const imageWidth = (totalWidth - (columns - 1) * spacing) / columns;
  const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio

  images.forEach((image, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    const x = 0.5 + col * (imageWidth + spacing);
    const y = startY + row * (imageHeight + spacing + 0.4);

    buildPositionedImage(slide, image.data, {
      x,
      y,
      width: imageWidth,
      height: imageHeight,
      caption: image.caption,
      rounded: true,
      shadow: true,
      theme,
    });
  });
}

// ═══════════════════════════════════════════════════
// IMAGE WITH TEXT
// ═══════════════════════════════════════════════════

export function buildImageWithText(
  slide: any,
  image: { data: string; caption?: string },
  text: string[],
  theme: PresentationTheme,
  layout: 'left' | 'right' = 'left',
): void {
  const imageX = layout === 'left' ? 0.5 : 5.2;
  const textX = layout === 'left' ? 5.2 : 0.5;

  // Image
  buildPositionedImage(slide, image.data, {
    x: imageX,
    y: 1.8,
    width: 4.3,
    height: 3.2,
    caption: image.caption,
    rounded: true,
    shadow: true,
    theme,
  });

  // Text bullets
  const bulletItems = text.map((t) => ({
    text: t,
    options: { bullet: { type: 'bullet' } },
  }));

  slide.addText(bulletItems, {
    x: textX,
    y: 1.8,
    w: 4.3,
    h: 3.5,
    fontSize: FONT_SIZES.bullet,
    color: theme.colors.bodyText,
    fontFace: theme.fonts.body,
    valign: 'top',
    paraSpaceAfter: theme.spacing.bulletSpacing,
  });
}

// ═══════════════════════════════════════════════════
// ICON/EMOJI BUILDER
// ═══════════════════════════════════════════════════

export function buildIcon(
  slide: any,
  icon: string,
  options: {
    x: number | string;
    y: number | string;
    size?: number;
    color?: string;
    theme: PresentationTheme;
  },
): void {
  const { x, y, size = 24, color, theme } = options;

  slide.addText(icon, {
    x,
    y,
    w: size / 72, // Convert pt to inches
    h: size / 72,
    fontSize: size,
    color: color || theme.colors.primary,
    align: 'center',
    valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════
// LOGO BUILDER
// ═══════════════════════════════════════════════════

export function buildLogo(
  slide: any,
  logoData: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
  size: { width: number; height: number } = { width: 1.0, height: 0.5 },
): void {
  const positions: Record<string, { x: number | string; y: number | string }> = {
    'top-left': { x: 0.3, y: 0.3 },
    'top-right': { x: '88%', y: 0.3 },
    'bottom-left': { x: 0.3, y: '90%' },
    'bottom-right': { x: '88%', y: '90%' },
    center: { x: '45%', y: '45%' },
  };

  const pos = positions[position] || positions['top-right'];

  const imageOptions: any = {
    x: pos.x,
    y: pos.y,
    sizing: { type: 'contain', w: size.width, h: size.height },
  };

  if (logoData.startsWith('data:')) {
    imageOptions.data = logoData;
  } else {
    imageOptions.data = `data:image/png;base64,${logoData}`;
  }

  slide.addImage(imageOptions);
}

// ═══════════════════════════════════════════════════
// BACKGROUND IMAGE
// ═══════════════════════════════════════════════════

export function setBackgroundImage(slide: any, imageData: string, opacity?: number): void {
  // Note: PptxGenJS doesn't support opacity directly on background images
  // This sets a full-slide background image

  if (imageData.startsWith('data:')) {
    slide.background = { data: imageData };
  } else if (imageData.startsWith('http')) {
    slide.background = { path: imageData };
  } else {
    slide.background = { data: `data:image/png;base64,${imageData}` };
  }
}

// ═══════════════════════════════════════════════════
// PLACEHOLDER IMAGE
// ═══════════════════════════════════════════════════

export function buildPlaceholderImage(
  slide: any,
  options: {
    x: number | string;
    y: number | string;
    width: number | string;
    height: number | string;
    text?: string;
    theme: PresentationTheme;
  },
): void {
  const { x, y, width, height, text = 'Image', theme } = options;

  // Placeholder box
  slide.addShape('rect', {
    x,
    y,
    w: width,
    h: height,
    fill: { color: theme.colors.codeBackground },
    line: { color: lightenColor(theme.colors.primary, 60), pt: 2, dashType: 'dash' },
  });

  // Placeholder icon
  slide.addText('🖼️', {
    x,
    y,
    w: width,
    h: typeof height === 'number' ? height * 0.6 : height,
    fontSize: 48,
    align: 'center',
    valign: 'middle',
  });

  // Placeholder text
  slide.addText(text, {
    x,
    y: typeof y === 'number' && typeof height === 'number' ? y + height * 0.6 : y,
    w: width,
    h: typeof height === 'number' ? height * 0.3 : height,
    fontSize: FONT_SIZES.caption,
    color: lightenColor(theme.colors.bodyText, 50),
    fontFace: theme.fonts.body,
    align: 'center',
    valign: 'top',
  });
}
