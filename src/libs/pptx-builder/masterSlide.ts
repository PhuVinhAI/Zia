/**
 * Master Slide Builder - Tạo master slide với các style
 */

import type { MasterSlideConfig, PresentationTheme } from './types.js';
import { lightenColor, safeColor } from './utils.js';

// ═══════════════════════════════════════════════════
// MASTER SLIDE DEFINITIONS
// ═══════════════════════════════════════════════════

export interface MasterSlideDefinition {
  title: string;
  background: { color: string } | { data: string };
  objects: any[];
}

export function createMasterSlides(
  pptx: any,
  theme: PresentationTheme,
  config?: MasterSlideConfig,
): void {
  // Default master slide
  createDefaultMaster(pptx, theme, config);

  // Title slide master
  createTitleMaster(pptx, theme, config);

  // Section slide master
  createSectionMaster(pptx, theme);

  // Content slide master
  createContentMaster(pptx, theme, config);

  // Two column master
  createTwoColumnMaster(pptx, theme);

  // Image slide master
  createImageMaster(pptx, theme);

  // Quote slide master
  createQuoteMaster(pptx, theme);

  // Blank slide master
  createBlankMaster(pptx, theme);

  // Thank you slide master
  createThankYouMaster(pptx, theme, config);
}

// ═══════════════════════════════════════════════════
// INDIVIDUAL MASTERS
// ═══════════════════════════════════════════════════

function createDefaultMaster(
  pptx: any,
  theme: PresentationTheme,
  config?: MasterSlideConfig,
): void {
  const objects: any[] = [];

  // Footer bar
  objects.push({
    rect: {
      x: 0,
      y: '95%',
      w: '100%',
      h: '5%',
      fill: { color: theme.colors.footerBackground },
    },
  });

  // Add logo if provided
  if (config?.logo) {
    objects.push({
      image: {
        data: config.logo.data,
        x: config.logo.x,
        y: config.logo.y,
        w: config.logo.width,
        h: config.logo.height,
      },
    });
  }

  pptx.defineSlideMaster({
    title: 'MASTER_DEFAULT',
    background: { color: theme.colors.background },
    objects,
  });
}

function createTitleMaster(pptx: any, theme: PresentationTheme, config?: MasterSlideConfig): void {
  const objects: any[] = [];

  // Decorative top bar
  objects.push({
    rect: {
      x: 0,
      y: 0,
      w: '100%',
      h: '8%',
      fill: { color: theme.colors.primary },
    },
  });

  // Decorative bottom bar
  objects.push({
    rect: {
      x: 0,
      y: '92%',
      w: '100%',
      h: '8%',
      fill: { color: theme.colors.primary },
    },
  });

  // Small accent line below title area (not in the middle of text)
  objects.push({
    rect: {
      x: '35%',
      y: '62%',
      w: '30%',
      h: 0.03,
      fill: { color: theme.colors.accent },
    },
  });

  if (config?.logo) {
    objects.push({
      image: {
        data: config.logo.data,
        x: '85%',
        y: '93%',
        w: config.logo.width * 0.7,
        h: config.logo.height * 0.7,
      },
    });
  }

  pptx.defineSlideMaster({
    title: 'MASTER_TITLE',
    background: { color: theme.colors.background },
    objects,
  });
}

function createSectionMaster(pptx: any, theme: PresentationTheme): void {
  const objects: any[] = [];

  // Full background with primary color
  objects.push({
    rect: {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: theme.colors.primary },
    },
  });

  // Accent stripe
  objects.push({
    rect: {
      x: 0,
      y: '45%',
      w: '30%',
      h: '10%',
      fill: { color: theme.colors.accent },
    },
  });

  pptx.defineSlideMaster({
    title: 'MASTER_SECTION',
    background: { color: theme.colors.primary },
    objects,
  });
}

function createContentMaster(
  pptx: any,
  theme: PresentationTheme,
  config?: MasterSlideConfig,
): void {
  const objects: any[] = [];

  // No header line - let title have full space
  // Footer bar only
  objects.push({
    rect: {
      x: 0,
      y: '95%',
      w: '100%',
      h: '5%',
      fill: { color: theme.colors.footerBackground },
    },
  });

  if (config?.logo) {
    objects.push({
      image: {
        data: config.logo.data,
        x: 0.3,
        y: '95.5%',
        w: config.logo.width * 0.5,
        h: config.logo.height * 0.5,
      },
    });
  }

  pptx.defineSlideMaster({
    title: 'MASTER_CONTENT',
    background: { color: theme.colors.background },
    objects,
  });
}

function createTwoColumnMaster(pptx: any, theme: PresentationTheme): void {
  const objects: any[] = [];

  // No header line - let title have full space
  // Column divider only
  objects.push({
    rect: {
      x: '49.5%',
      y: 1.8,
      w: 0.02,
      h: 3.5,
      fill: { color: safeColor(theme.colors.secondary) },
    },
  });

  // Footer bar
  objects.push({
    rect: {
      x: 0,
      y: '95%',
      w: '100%',
      h: '5%',
      fill: { color: theme.colors.footerBackground },
    },
  });

  pptx.defineSlideMaster({
    title: 'MASTER_TWO_COLUMN',
    background: { color: theme.colors.background },
    objects,
  });
}

function createImageMaster(pptx: any, theme: PresentationTheme): void {
  const objects: any[] = [];

  // Subtle header
  objects.push({
    rect: {
      x: 0,
      y: 0,
      w: '100%',
      h: 1.2,
      fill: { color: lightenColor(theme.colors.primary, 90) },
    },
  });

  // Footer bar
  objects.push({
    rect: {
      x: 0,
      y: '95%',
      w: '100%',
      h: '5%',
      fill: { color: theme.colors.footerBackground },
    },
  });

  pptx.defineSlideMaster({
    title: 'MASTER_IMAGE',
    background: { color: theme.colors.background },
    objects,
  });
}

function createQuoteMaster(pptx: any, theme: PresentationTheme): void {
  const objects: any[] = [];

  // Large quote mark background
  objects.push({
    text: {
      text: '"',
      options: {
        x: 0.5,
        y: 0.5,
        w: 2,
        h: 2,
        fontSize: 200,
        color: lightenColor(theme.colors.primary, 80),
        fontFace: 'Georgia',
      },
    },
  });

  // Accent bar on left
  objects.push({
    rect: {
      x: 0,
      y: '30%',
      w: 0.15,
      h: '40%',
      fill: { color: theme.colors.accent },
    },
  });

  // Footer bar
  objects.push({
    rect: {
      x: 0,
      y: '95%',
      w: '100%',
      h: '5%',
      fill: { color: theme.colors.footerBackground },
    },
  });

  pptx.defineSlideMaster({
    title: 'MASTER_QUOTE',
    background: { color: theme.colors.background },
    objects,
  });
}

function createBlankMaster(pptx: any, theme: PresentationTheme): void {
  pptx.defineSlideMaster({
    title: 'MASTER_BLANK',
    background: { color: theme.colors.background },
    objects: [],
  });
}

function createThankYouMaster(
  pptx: any,
  theme: PresentationTheme,
  config?: MasterSlideConfig,
): void {
  const objects: any[] = [];

  // Full background gradient effect (simulated with rectangles)
  objects.push({
    rect: {
      x: 0,
      y: 0,
      w: '100%',
      h: '50%',
      fill: { color: theme.colors.primary },
    },
  });

  objects.push({
    rect: {
      x: 0,
      y: '50%',
      w: '100%',
      h: '50%',
      fill: { color: theme.colors.secondary },
    },
  });

  // Decorative circle
  objects.push({
    rect: {
      x: '40%',
      y: '35%',
      w: '20%',
      h: '30%',
      fill: { color: safeColor(theme.colors.accent) },
    },
  });

  if (config?.logo) {
    objects.push({
      image: {
        data: config.logo.data,
        x: '42%',
        y: '75%',
        w: config.logo.width,
        h: config.logo.height,
      },
    });
  }

  pptx.defineSlideMaster({
    title: 'MASTER_THANKYOU',
    background: { color: theme.colors.primary },
    objects,
  });
}

// ═══════════════════════════════════════════════════
// HELPER: Get master name for slide type
// ═══════════════════════════════════════════════════

export function getMasterForSlideType(type: string): string {
  const mapping: Record<string, string> = {
    title: 'MASTER_TITLE',
    section: 'MASTER_SECTION',
    content: 'MASTER_CONTENT',
    twoColumn: 'MASTER_TWO_COLUMN',
    comparison: 'MASTER_TWO_COLUMN',
    imageOnly: 'MASTER_IMAGE',
    quote: 'MASTER_QUOTE',
    blank: 'MASTER_BLANK',
    thankyou: 'MASTER_THANKYOU',
    agenda: 'MASTER_CONTENT',
  };

  return mapping[type] || 'MASTER_DEFAULT';
}
