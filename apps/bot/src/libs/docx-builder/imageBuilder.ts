/**
 * Image Builder - Xử lý hình ảnh trong Word document
 */

import { ImageRun, Paragraph, TextRun } from 'docx';
import { ALIGNMENTS } from './constants.js';
import { getTheme } from './themes.js';
import type { DocumentTheme, ImageConfig } from './types.js';

// ═══════════════════════════════════════════════════
// IMAGE BUILDER
// ═══════════════════════════════════════════════════

/**
 * Build image paragraph từ config
 */
export function buildImageParagraph(config: ImageConfig, theme?: DocumentTheme): Paragraph[] {
  const t = theme || getTheme();
  const paragraphs: Paragraph[] = [];

  // Convert base64 to buffer if needed
  let imageData: Buffer;
  if (typeof config.data === 'string') {
    // Remove data URL prefix if present
    const base64Data = config.data.replace(/^data:image\/\w+;base64,/, '');
    imageData = Buffer.from(base64Data, 'base64');
  } else {
    imageData = config.data;
  }

  const alignment = ALIGNMENTS[config.alignment || 'center'];

  // Image paragraph
  paragraphs.push(
    new Paragraph({
      alignment,
      children: [
        new ImageRun({
          data: imageData,
          transformation: {
            width: config.width || 400,
            height: config.height || 300,
          },
          type: 'png', // Default type
        }),
      ],
      spacing: { before: 200, after: config.caption ? 80 : 200 },
    }),
  );

  // Caption if provided
  if (config.caption) {
    paragraphs.push(
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: config.caption,
            italics: true,
            size: 20,
            color: t.colors.secondary,
            font: t.fonts.body,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  return paragraphs;
}

/**
 * Parse image syntax từ markdown
 * Syntax: ![alt text](url "caption")
 * Hoặc: [IMAGE: base64data, width=400, height=300, caption="text"]
 */
export function parseImageSyntax(line: string): ImageConfig | null {
  // Standard markdown image
  const mdMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (mdMatch) {
    const alt = mdMatch[1];
    const urlPart = mdMatch[2];

    // Check for title/caption in quotes
    const titleMatch = urlPart.match(/^(.+?)\s+"([^"]+)"$/);
    if (titleMatch) {
      return {
        data: titleMatch[1].trim(),
        caption: titleMatch[2] || alt,
      };
    }

    return {
      data: urlPart.trim(),
      caption: alt || undefined,
    };
  }

  // Extended image syntax
  const extMatch = line.match(/\[IMAGE:\s*([^,\]]+)(?:,\s*(.+))?\]/i);
  if (extMatch) {
    const data = extMatch[1].trim();
    const options = extMatch[2] || '';

    const config: ImageConfig = { data };

    // Parse options
    const widthMatch = options.match(/width=(\d+)/i);
    const heightMatch = options.match(/height=(\d+)/i);
    const captionMatch = options.match(/caption="([^"]+)"/i);
    const alignMatch = options.match(/align=(left|center|right)/i);

    if (widthMatch) config.width = parseInt(widthMatch[1], 10);
    if (heightMatch) config.height = parseInt(heightMatch[1], 10);
    if (captionMatch) config.caption = captionMatch[1];
    if (alignMatch) config.alignment = alignMatch[1] as 'left' | 'center' | 'right';

    return config;
  }

  return null;
}
