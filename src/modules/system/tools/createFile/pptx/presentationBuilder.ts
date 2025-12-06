/**
 * Presentation Builder - Main builder class cho PowerPoint
 */

import PptxGenJS from 'pptxgenjs';
import {
  buildAreaChart,
  buildBarChart,
  buildChart,
  buildLineChart,
  buildPieChart,
  buildStatCard,
} from './chartBuilder.js';
import { buildCodeBlock, buildCodeComparison, buildStyledCodeBlock } from './codeBuilder.js';
import { LAYOUTS } from './constants.js';
import { parseContent, parseOptions } from './contentParser.js';
import {
  buildImage,
  buildImageGallery,
  buildImageWithText,
  buildLogo,
  buildPositionedImage,
} from './imageBuilder.js';
import { createMasterSlides, getMasterForSlideType } from './masterSlide.js';
import {
  buildBadge,
  buildBox,
  buildCallout,
  buildDecoratedDivider,
  buildDivider,
  buildIconGrid,
  buildProcessFlow,
  buildShape,
  buildTimeline,
} from './shapeBuilder.js';
import { buildSlide } from './slideBuilder.js';
import {
  buildComparisonTable,
  buildFeatureTable,
  buildStyledTable,
  buildTable,
} from './tableBuilder.js';
import { getTheme } from './themes.js';
import type {
  ChartConfig,
  MasterSlideConfig,
  ParsedSlide,
  PresentationOptions,
  PresentationTheme,
  SlideType,
} from './types.js';

// ═══════════════════════════════════════════════════
// PRESENTATION BUILDER CLASS
// ═══════════════════════════════════════════════════

export class PresentationBuilder {
  private pptx: any;
  private theme: PresentationTheme;
  private options: PresentationOptions;
  private slideCount: number = 0;

  constructor(options: PresentationOptions = {}) {
    const Pptx = (PptxGenJS as any).default || PptxGenJS;
    this.pptx = new Pptx();
    this.options = options;
    this.theme = options.theme ? getTheme(options.theme.name) : getTheme();

    this.initializePresentation();
  }

  private initializePresentation(): void {
    // Set metadata
    this.pptx.author = this.options.author || 'Zia AI Bot';
    this.pptx.title = this.options.title || 'Presentation';
    this.pptx.subject = this.options.subject || 'Created by Zia AI Bot';
    this.pptx.company = this.options.company || 'Zia AI';

    // Set layout
    const layout = this.options.layout || 'LAYOUT_16x9';
    this.pptx.layout = layout;

    // Create master slides
    createMasterSlides(this.pptx, this.theme, this.options.masterSlide);
  }

  // ═══════════════════════════════════════════════════
  // SLIDE CREATION
  // ═══════════════════════════════════════════════════

  addSlide(type: SlideType = 'content'): any {
    const masterName = getMasterForSlideType(type);
    const slide = this.pptx.addSlide({ masterName });
    this.slideCount++;
    return slide;
  }

  addTitleSlide(title: string, subtitle?: string, author?: string): this {
    const slide = this.addSlide('title');

    slide.addText(title, {
      x: 0.5,
      y: 2.0,
      w: '90%',
      h: 1.5,
      fontSize: 54,
      bold: true,
      color: this.theme.colors.titleText,
      fontFace: this.theme.fonts.title,
      align: 'center',
      valign: 'middle',
    });

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5,
        y: 3.5,
        w: '90%',
        h: 0.8,
        fontSize: 24,
        color: this.theme.colors.bodyText,
        fontFace: this.theme.fonts.subtitle,
        align: 'center',
      });
    }

    if (author) {
      slide.addText(author, {
        x: 0.5,
        y: 4.5,
        w: '90%',
        h: 0.5,
        fontSize: 18,
        color: this.theme.colors.bodyText + 'AA',
        fontFace: this.theme.fonts.body,
        align: 'center',
      });
    }

    return this;
  }

  addSectionSlide(title: string, subtitle?: string): this {
    const slide = this.addSlide('section');

    slide.addText(title, {
      x: 0.5,
      y: 2.2,
      w: '90%',
      h: 1.2,
      fontSize: 40,
      bold: true,
      color: 'FFFFFF',
      fontFace: this.theme.fonts.title,
      align: 'left',
    });

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5,
        y: 3.4,
        w: '90%',
        h: 0.6,
        fontSize: 24,
        color: 'FFFFFF' + 'CC',
        fontFace: this.theme.fonts.subtitle,
        align: 'left',
      });
    }

    return this;
  }

  addContentSlide(title: string, bullets: string[], subtitle?: string): this {
    const slide = this.addSlide('content');
    let currentY = 0.5;

    slide.addText(title, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 1.0,
      fontSize: 32,
      bold: true,
      color: this.theme.colors.titleText,
      fontFace: this.theme.fonts.title,
    });
    currentY = 1.6;

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5,
        y: currentY,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: this.theme.colors.bodyText + 'CC',
        fontFace: this.theme.fonts.subtitle,
      });
      currentY += 0.6;
    }

    const bulletItems = bullets.map((text) => ({
      text,
      options: { bullet: { type: 'bullet' }, indentLevel: 0 },
    }));

    slide.addText(bulletItems, {
      x: 0.5,
      y: currentY,
      w: '90%',
      h: 3.5,
      fontSize: 18,
      color: this.theme.colors.bodyText,
      fontFace: this.theme.fonts.body,
      valign: 'top',
      paraSpaceAfter: this.theme.spacing.bulletSpacing,
    });

    return this;
  }

  addTwoColumnSlide(title: string, leftContent: string[], rightContent: string[]): this {
    const slide = this.addSlide('twoColumn');

    slide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 1.0,
      fontSize: 32,
      bold: true,
      color: this.theme.colors.titleText,
      fontFace: this.theme.fonts.title,
    });

    // Left column
    const leftItems = leftContent.map((text) => ({
      text,
      options: { bullet: { type: 'bullet' } },
    }));

    slide.addText(leftItems, {
      x: 0.5,
      y: 1.8,
      w: '44%',
      h: 3.5,
      fontSize: 18,
      color: this.theme.colors.bodyText,
      fontFace: this.theme.fonts.body,
      valign: 'top',
      paraSpaceAfter: this.theme.spacing.bulletSpacing,
    });

    // Right column
    const rightItems = rightContent.map((text) => ({
      text,
      options: { bullet: { type: 'bullet' } },
    }));

    slide.addText(rightItems, {
      x: 5.2,
      y: 1.8,
      w: '44%',
      h: 3.5,
      fontSize: 18,
      color: this.theme.colors.bodyText,
      fontFace: this.theme.fonts.body,
      valign: 'top',
      paraSpaceAfter: this.theme.spacing.bulletSpacing,
    });

    return this;
  }

  addQuoteSlide(quote: string, author?: string, source?: string): this {
    const slide = this.addSlide('quote');

    slide.addText(`"${quote}"`, {
      x: 1.0,
      y: 1.5,
      w: '80%',
      h: 2.5,
      fontSize: 28,
      italic: true,
      color: this.theme.colors.bodyText,
      fontFace: 'Georgia',
      align: 'center',
      valign: 'middle',
    });

    if (author) {
      slide.addText(`— ${author}`, {
        x: 1.0,
        y: 4.2,
        w: '80%',
        h: 0.5,
        fontSize: 18,
        color: this.theme.colors.bodyText + 'AA',
        fontFace: this.theme.fonts.body,
        align: 'right',
      });
    }

    if (source) {
      slide.addText(source, {
        x: 1.0,
        y: 4.7,
        w: '80%',
        h: 0.4,
        fontSize: 12,
        italic: true,
        color: this.theme.colors.bodyText + '88',
        fontFace: this.theme.fonts.body,
        align: 'right',
      });
    }

    return this;
  }

  addThankYouSlide(title: string = 'Thank You!', contactInfo?: string[]): this {
    const slide = this.addSlide('thankyou');

    slide.addText(title, {
      x: 0.5,
      y: 2.0,
      w: '90%',
      h: 1.5,
      fontSize: 54,
      bold: true,
      color: 'FFFFFF',
      fontFace: this.theme.fonts.title,
      align: 'center',
      valign: 'middle',
    });

    if (contactInfo && contactInfo.length > 0) {
      slide.addText(contactInfo.join('\n'), {
        x: 0.5,
        y: 3.8,
        w: '90%',
        h: 1.0,
        fontSize: 18,
        color: 'FFFFFF' + 'CC',
        fontFace: this.theme.fonts.body,
        align: 'center',
      });
    }

    return this;
  }

  // ═══════════════════════════════════════════════════
  // CONTENT BUILDERS (delegated)
  // ═══════════════════════════════════════════════════

  addTableToSlide(
    slide: any,
    table: { headers: string[]; rows: string[][] },
    y: number = 2.0,
  ): this {
    buildTable(slide, table, y, this.theme);
    return this;
  }

  addChartToSlide(slide: any, config: ChartConfig): this {
    buildChart(slide, config, this.theme);
    return this;
  }

  addCodeToSlide(slide: any, code: string, language?: string, y: number = 2.0): this {
    buildCodeBlock(slide, { code, language }, y, this.theme);
    return this;
  }

  addImageToSlide(
    slide: any,
    imageData: string,
    options?: { x?: number; y?: number; width?: number; height?: number; caption?: string },
  ): this {
    buildPositionedImage(slide, imageData, {
      x: options?.x || 2.5,
      y: options?.y || 1.5,
      width: options?.width || 5.0,
      height: options?.height || 3.5,
      caption: options?.caption,
      theme: this.theme,
    });
    return this;
  }

  addCalloutToSlide(
    slide: any,
    type: 'info' | 'tip' | 'note' | 'warning' | 'important' | 'success' | 'error',
    text: string,
    y: number = 2.0,
  ): this {
    buildCallout(slide, type, text, { y, theme: this.theme });
    return this;
  }

  addBoxToSlide(
    slide: any,
    type: 'info' | 'success' | 'warning' | 'error' | 'note' | 'quote' | 'code',
    title: string,
    content: string,
    y: number = 2.0,
  ): this {
    buildBox(slide, type, title, content, { y, theme: this.theme });
    return this;
  }

  addProcessFlowToSlide(
    slide: any,
    steps: Array<{ title: string; description?: string }>,
    y: number = 2.5,
  ): this {
    buildProcessFlow(slide, steps, this.theme, y);
    return this;
  }

  addTimelineToSlide(
    slide: any,
    events: Array<{ date: string; title: string; description?: string }>,
    y: number = 2.5,
  ): this {
    buildTimeline(slide, events, this.theme, y);
    return this;
  }

  // ═══════════════════════════════════════════════════
  // BUILD FROM MARKDOWN
  // ═══════════════════════════════════════════════════

  buildFromMarkdown(content: string): this {
    const { options, cleanContent } = parseOptions(content);

    // Apply options
    if (options.theme?.name) {
      this.theme = getTheme(options.theme.name);
    }
    if (options.title) {
      this.pptx.title = options.title;
    }
    if (options.author) {
      this.pptx.author = options.author;
    }

    // Parse and build slides
    const slides = parseContent(cleanContent);

    for (let i = 0; i < slides.length; i++) {
      buildSlide(this.pptx, slides[i], i, this.theme, this.options.showSlideNumbers !== false);
    }

    return this;
  }

  // ═══════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════

  async build(): Promise<Buffer> {
    const data = await this.pptx.write({ outputType: 'nodebuffer' });
    return data as Buffer;
  }

  getSlideCount(): number {
    return this.slideCount;
  }

  getTheme(): PresentationTheme {
    return this.theme;
  }

  setTheme(themeName: string): this {
    this.theme = getTheme(themeName);
    return this;
  }
}

// ═══════════════════════════════════════════════════
// SIMPLE BUILDER FUNCTIONS
// ═══════════════════════════════════════════════════

export async function buildPresentation(
  content: string,
  options?: PresentationOptions,
): Promise<Buffer> {
  const builder = new PresentationBuilder(options);
  return builder.buildFromMarkdown(content).build();
}

export async function buildSimplePresentation(
  slides: Array<{
    title: string;
    bullets?: string[];
    type?: SlideType;
  }>,
  options?: PresentationOptions,
): Promise<Buffer> {
  const builder = new PresentationBuilder(options);

  for (const slideData of slides) {
    if (slideData.type === 'title') {
      builder.addTitleSlide(slideData.title, slideData.bullets?.[0]);
    } else if (slideData.type === 'section') {
      builder.addSectionSlide(slideData.title, slideData.bullets?.[0]);
    } else {
      builder.addContentSlide(slideData.title, slideData.bullets || []);
    }
  }

  return builder.build();
}
