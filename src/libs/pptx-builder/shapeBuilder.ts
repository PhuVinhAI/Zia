/**
 * Shape Builder - Tạo các hình dạng trong PowerPoint
 */

import { BADGE_STYLES, BOX_STYLES, CALLOUT_STYLES, FONT_SIZES, SHAPE_TYPES } from './constants.js';
import type { PresentationTheme, ShapeConfig } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// BASIC SHAPES
// ═══════════════════════════════════════════════════

export function buildShape(slide: any, config: ShapeConfig, theme: PresentationTheme): void {
  const shapeType = SHAPE_TYPES[config.type] || 'rect';

  const shapeOptions: any = {
    x: config.x,
    y: config.y,
    w: config.width,
    h: config.height,
    fill: config.fill ? { color: config.fill } : { color: theme.colors.primary },
    line: config.line ? { color: config.line.color, pt: config.line.width } : undefined,
  };

  slide.addShape(shapeType, shapeOptions);

  // Add text if provided
  if (config.text) {
    slide.addText(config.text, {
      x: config.x,
      y: config.y,
      w: config.width,
      h: config.height,
      fontSize: config.fontSize || FONT_SIZES.body,
      color: config.fontColor || 'FFFFFF',
      fontFace: theme.fonts.body,
      align: 'center',
      valign: 'middle',
    });
  }
}

// ═══════════════════════════════════════════════════
// CALLOUT BOX
// ═══════════════════════════════════════════════════

export function buildCallout(
  slide: any,
  type: keyof typeof CALLOUT_STYLES,
  text: string,
  options: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    theme: PresentationTheme;
  },
): void {
  const { x = 0.5, y = 2.0, width = 9.0, theme } = options;
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;

  // Background
  slide.addShape('roundRect', {
    x,
    y,
    w: width,
    h: 0.8,
    fill: { color: style.backgroundColor },
    line: { color: style.borderColor, pt: 2 },
  });

  // Icon and text
  slide.addText(`${style.icon} ${text}`, {
    x: typeof x === 'number' ? x + 0.15 : x,
    y,
    w: typeof width === 'number' ? width - 0.3 : width,
    h: 0.8,
    fontSize: FONT_SIZES.body,
    color: style.textColor,
    fontFace: theme.fonts.body,
    valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════
// STYLED BOX
// ═══════════════════════════════════════════════════

export function buildBox(
  slide: any,
  type: keyof typeof BOX_STYLES,
  title: string,
  content: string,
  options: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    theme: PresentationTheme;
  },
): void {
  const { x = 0.5, y = 2.0, width = 9.0, height = 2.0, theme } = options;
  const style = BOX_STYLES[type] || BOX_STYLES.info;

  // Main box
  slide.addShape('roundRect', {
    x,
    y,
    w: width,
    h: height,
    fill: { color: style.fill },
    line: { color: style.border, pt: 2 },
  });

  // Title bar
  if (title) {
    slide.addShape('rect', {
      x,
      y,
      w: width,
      h: 0.5,
      fill: { color: style.border },
    });

    slide.addText(title, {
      x: typeof x === 'number' ? x + 0.15 : x,
      y,
      w: typeof width === 'number' ? width - 0.3 : width,
      h: 0.5,
      fontSize: FONT_SIZES.body,
      bold: true,
      color: 'FFFFFF',
      fontFace: theme.fonts.body,
      valign: 'middle',
    });
  }

  // Content
  slide.addText(content, {
    x: typeof x === 'number' ? x + 0.15 : x,
    y: typeof y === 'number' ? y + (title ? 0.6 : 0.15) : y,
    w: typeof width === 'number' ? width - 0.3 : width,
    h: typeof height === 'number' ? height - (title ? 0.75 : 0.3) : height,
    fontSize: FONT_SIZES.body - 2,
    color: style.textColor,
    fontFace: theme.fonts.body,
    valign: 'top',
  });
}

// ═══════════════════════════════════════════════════
// BADGE
// ═══════════════════════════════════════════════════

export function buildBadge(
  slide: any,
  text: string,
  type: keyof typeof BADGE_STYLES,
  options: {
    x: number | string;
    y: number | string;
    theme: PresentationTheme;
  },
): void {
  const { x, y, theme } = options;
  const style = BADGE_STYLES[type] || BADGE_STYLES.default;

  // Calculate width based on text length
  const width = Math.max(text.length * 0.12 + 0.3, 0.8);

  // Badge background
  slide.addShape('roundRect', {
    x,
    y,
    w: width,
    h: 0.35,
    fill: { color: style.fill },
  });

  // Badge text
  slide.addText(text, {
    x,
    y,
    w: width,
    h: 0.35,
    fontSize: 10,
    bold: true,
    color: style.text,
    fontFace: theme.fonts.body,
    align: 'center',
    valign: 'middle',
  });
}

// ═══════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════

export function buildDivider(
  slide: any,
  y: number,
  theme: PresentationTheme,
  style: 'solid' | 'dashed' | 'dotted' | 'double' = 'solid',
): void {
  const dashTypes: Record<string, string> = {
    solid: 'solid',
    dashed: 'dash',
    dotted: 'sysDot',
    double: 'solid',
  };

  slide.addShape('line', {
    x: 0.5,
    y,
    w: 9.0,
    h: 0,
    line: {
      color: lightenColor(theme.colors.primary, 40),
      pt: style === 'double' ? 3 : 1,
      dashType: dashTypes[style],
    },
  });

  if (style === 'double') {
    slide.addShape('line', {
      x: 0.5,
      y: y + 0.08,
      w: 9.0,
      h: 0,
      line: {
        color: lightenColor(theme.colors.primary, 40),
        pt: 1,
        dashType: 'solid',
      },
    });
  }
}

// ═══════════════════════════════════════════════════
// DECORATED DIVIDER
// ═══════════════════════════════════════════════════

export function buildDecoratedDivider(
  slide: any,
  y: number,
  text: string,
  theme: PresentationTheme,
): void {
  // Left line
  slide.addShape('line', {
    x: 0.5,
    y,
    w: 3.5,
    h: 0,
    line: { color: lightenColor(theme.colors.primary, 40), pt: 1 },
  });

  // Center text
  slide.addText(text, {
    x: 4.0,
    y: y - 0.15,
    w: 2.0,
    h: 0.3,
    fontSize: 12,
    color: theme.colors.primary,
    fontFace: theme.fonts.body,
    align: 'center',
    valign: 'middle',
  });

  // Right line
  slide.addShape('line', {
    x: 6.0,
    y,
    w: 3.5,
    h: 0,
    line: { color: lightenColor(theme.colors.primary, 40), pt: 1 },
  });
}

// ═══════════════════════════════════════════════════
// ARROW
// ═══════════════════════════════════════════════════

export function buildArrow(
  slide: any,
  from: { x: number; y: number },
  to: { x: number; y: number },
  theme: PresentationTheme,
  options?: {
    color?: string;
    width?: number;
    style?: 'solid' | 'dashed';
    headType?: 'arrow' | 'triangle' | 'stealth';
  },
): void {
  const { color, width = 2, style = 'solid', headType = 'arrow' } = options || {};

  slide.addShape('line', {
    x: from.x,
    y: from.y,
    w: to.x - from.x,
    h: to.y - from.y,
    line: {
      color: color || theme.colors.primary,
      pt: width,
      dashType: style === 'dashed' ? 'dash' : 'solid',
      endArrowType: headType,
    },
  });
}

// ═══════════════════════════════════════════════════
// PROCESS FLOW
// ═══════════════════════════════════════════════════

export function buildProcessFlow(
  slide: any,
  steps: Array<{ title: string; description?: string }>,
  theme: PresentationTheme,
  y: number = 2.5,
): void {
  const stepWidth = 2.0;
  const arrowWidth = 0.5;
  const totalWidth = steps.length * stepWidth + (steps.length - 1) * arrowWidth;
  const startX = (10 - totalWidth) / 2;

  steps.forEach((step, index) => {
    const x = startX + index * (stepWidth + arrowWidth);

    // Step circle/box
    slide.addShape('roundRect', {
      x,
      y,
      w: stepWidth,
      h: 1.2,
      fill: { color: theme.colors.primary },
      line: { pt: 0 },
    });

    // Step number
    slide.addText(String(index + 1), {
      x,
      y,
      w: stepWidth,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: 'FFFFFF',
      fontFace: theme.fonts.body,
      align: 'center',
    });

    // Step title
    slide.addText(step.title, {
      x,
      y: y + 0.4,
      w: stepWidth,
      h: 0.5,
      fontSize: 12,
      color: 'FFFFFF',
      fontFace: theme.fonts.body,
      align: 'center',
      valign: 'middle',
    });

    // Description below
    if (step.description) {
      slide.addText(step.description, {
        x,
        y: y + 1.3,
        w: stepWidth,
        h: 0.6,
        fontSize: 10,
        color: theme.colors.bodyText,
        fontFace: theme.fonts.body,
        align: 'center',
        valign: 'top',
      });
    }

    // Arrow to next step
    if (index < steps.length - 1) {
      slide.addText('→', {
        x: x + stepWidth,
        y: y + 0.4,
        w: arrowWidth,
        h: 0.4,
        fontSize: 24,
        color: theme.colors.primary,
        align: 'center',
        valign: 'middle',
      });
    }
  });
}

// ═══════════════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════════════

export function buildTimeline(
  slide: any,
  events: Array<{ date: string; title: string; description?: string }>,
  theme: PresentationTheme,
  y: number = 2.5,
): void {
  const lineY = y + 0.5;

  // Main timeline line
  slide.addShape('line', {
    x: 0.5,
    y: lineY,
    w: 9.0,
    h: 0,
    line: { color: theme.colors.primary, pt: 3 },
  });

  const eventWidth = 9.0 / events.length;

  events.forEach((event, index) => {
    const x = 0.5 + index * eventWidth + eventWidth / 2;
    const isTop = index % 2 === 0;

    // Event dot
    slide.addShape('ellipse', {
      x: x - 0.1,
      y: lineY - 0.1,
      w: 0.2,
      h: 0.2,
      fill: { color: theme.colors.accent },
      line: { color: theme.colors.primary, pt: 2 },
    });

    // Connector line
    slide.addShape('line', {
      x,
      y: isTop ? lineY - 0.8 : lineY + 0.1,
      w: 0,
      h: 0.7,
      line: { color: lightenColor(theme.colors.primary, 40), pt: 1 },
    });

    // Date
    slide.addText(event.date, {
      x: x - eventWidth / 2,
      y: isTop ? lineY - 1.2 : lineY + 0.9,
      w: eventWidth,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: theme.colors.primary,
      fontFace: theme.fonts.body,
      align: 'center',
    });

    // Title
    slide.addText(event.title, {
      x: x - eventWidth / 2,
      y: isTop ? lineY - 1.5 : lineY + 1.2,
      w: eventWidth,
      h: 0.3,
      fontSize: 11,
      color: theme.colors.bodyText,
      fontFace: theme.fonts.body,
      align: 'center',
    });
  });
}

// ═══════════════════════════════════════════════════
// ICON GRID
// ═══════════════════════════════════════════════════

export function buildIconGrid(
  slide: any,
  items: Array<{ icon: string; label: string }>,
  theme: PresentationTheme,
  options?: {
    x?: number;
    y?: number;
    columns?: number;
    iconSize?: number;
  },
): void {
  const { x = 0.5, y = 2.0, columns = 4, iconSize = 36 } = options || {};

  const itemWidth = 9.0 / columns;
  const itemHeight = 1.2;

  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const itemX = x + col * itemWidth;
    const itemY = y + row * itemHeight;

    // Icon
    slide.addText(item.icon, {
      x: itemX,
      y: itemY,
      w: itemWidth,
      h: 0.7,
      fontSize: iconSize,
      align: 'center',
      valign: 'middle',
    });

    // Label
    slide.addText(item.label, {
      x: itemX,
      y: itemY + 0.7,
      w: itemWidth,
      h: 0.4,
      fontSize: 11,
      color: theme.colors.bodyText,
      fontFace: theme.fonts.body,
      align: 'center',
    });
  });
}
