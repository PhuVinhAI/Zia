/**
 * PPTX Handler - Tao file PowerPoint voi markdown support
 */

import PptxGenJS from 'pptxgenjs';
import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';
import { type InlineToken, parseMarkdown } from '../../../../shared/utils/markdownParser.js';
import type { FileHandler } from './types.js';

interface SlideContent {
  title?: string;
  subtitle?: string;
  bullets: string[];
  codeBlocks: string[];
}

function parseSlides(content: string): string[] {
  return content
    .split(/\n(?:---|\*\*\*)\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function tokensToText(tokens: InlineToken[]): string {
  return tokens.map((t) => t.text).join('');
}

function parseSlideContent(slideText: string): SlideContent {
  const blocks = parseMarkdown(slideText);
  const result: SlideContent = { bullets: [], codeBlocks: [] };
  for (const block of blocks) {
    switch (block.type) {
      case 'heading1':
        result.title = tokensToText(block.tokens);
        break;
      case 'heading2':
      case 'heading3':
        if (!result.title) {
          result.title = tokensToText(block.tokens);
        } else if (!result.subtitle) {
          result.subtitle = tokensToText(block.tokens);
        } else {
          result.bullets.push(tokensToText(block.tokens));
        }
        break;
      case 'bullet':
      case 'numbered':
        result.bullets.push(tokensToText(block.tokens));
        break;
      case 'codeBlock':
        result.codeBlocks.push(block.raw || '');
        break;
      case 'paragraph':
        if (block.tokens.length > 0) {
          const text = tokensToText(block.tokens);
          if (text.trim()) result.bullets.push(text);
        }
        break;
    }
  }
  return result;
}

export const pptxHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  const Pptx = (PptxGenJS as any).default || PptxGenJS;
  const pptx = new Pptx();
  pptx.author = opts?.author || 'Zia AI Bot';
  pptx.title = opts?.title || opts?.filename || 'Presentation';
  pptx.subject = 'Created by Zia AI Bot';
  pptx.company = 'Zia AI';
  pptx.layout = 'LAYOUT_16x9';

  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'FFFFFF' },
    objects: [{ rect: { x: 0, y: '95%', w: '100%', h: '5%', fill: { color: '0066CC' } } }],
  });

  const slides = parseSlides(content);
  if (slides.length === 0) slides.push(content);

  for (let i = 0; i < slides.length; i++) {
    const slideContent = parseSlideContent(slides[i]);
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

    if (i === 0 && opts?.title && !slideContent.title) slideContent.title = opts.title;

    if (slideContent.title) {
      slide.addText(slideContent.title, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 32,
        bold: true,
        color: '0066CC',
        fontFace: 'Arial',
      });
    }

    if (slideContent.subtitle) {
      slide.addText(slideContent.subtitle, {
        x: 0.5,
        y: 1.4,
        w: '90%',
        h: 0.6,
        fontSize: 20,
        color: '666666',
        fontFace: 'Arial',
      });
    }

    if (slideContent.bullets.length > 0) {
      const startY = slideContent.subtitle ? 2.2 : slideContent.title ? 1.8 : 0.5;
      slide.addText(
        slideContent.bullets.map((t: string) => ({
          text: t,
          options: { bullet: true, indentLevel: 0 },
        })),
        {
          x: 0.5,
          y: startY,
          w: '90%',
          h: 4,
          fontSize: 18,
          color: '333333',
          fontFace: 'Arial',
          valign: 'top',
          paraSpaceAfter: 12,
        },
      );
    }

    if (slideContent.codeBlocks.length > 0) {
      const codeY = slideContent.bullets.length > 0 ? 4.5 : 2;
      for (const code of slideContent.codeBlocks) {
        slide.addText(code, {
          x: 0.5,
          y: codeY,
          w: '90%',
          h: 1.5,
          fontSize: 12,
          fontFace: 'Consolas',
          color: '333333',
          fill: { color: 'F5F5F5' },
          valign: 'top',
        });
      }
    }

    slide.addText(String(i + 1), {
      x: '95%',
      y: '95%',
      w: 0.4,
      h: 0.3,
      fontSize: 10,
      color: 'FFFFFF',
      align: 'center',
    });
  }

  const data = await pptx.write({ outputType: 'nodebuffer' });
  return data as Buffer;
};
