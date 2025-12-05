/**
 * Document Builder - Main builder để tạo Word document hoàn chỉnh
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { WordDocumentOptions } from './types.js';
import { getTheme } from './themes.js';
import { getMargins, getPageSize, ORIENTATIONS } from './constants.js';
import { buildDocumentStyles, buildNumberingConfig } from './styleBuilder.js';
import { parseExtendedContent, tokensToTextRuns } from './contentBuilder.js';
import { buildDefaultFooter, buildDefaultHeader, buildFooter, buildHeader } from './headerFooter.js';
import { parseInline } from '../../../../../shared/utils/markdownParser.js';

// ═══════════════════════════════════════════════════
// DOCUMENT BUILDER CLASS
// ═══════════════════════════════════════════════════

export class WordDocumentBuilder {
  private options: WordDocumentOptions;
  private theme;

  constructor(options: Partial<WordDocumentOptions> = {}) {
    this.options = options as WordDocumentOptions;
    this.theme = getTheme(options.theme?.name);
  }

  /**
   * Build document từ markdown content
   */
  async build(content: string): Promise<Buffer> {
    const paragraphs = parseExtendedContent(content, this.theme);
    
    // Build title if provided
    const titleParagraphs = this.buildTitleSection();
    
    // Build section properties
    const sectionProperties = this.buildSectionProperties();

    const doc = new Document({
      creator: this.options.author || 'Zia AI Bot',
      title: this.options.title || this.options.filename || 'Document',
      description: 'Created by Zia AI Bot',
      styles: buildDocumentStyles(this.theme),
      numbering: buildNumberingConfig(),
      sections: [
        {
          properties: sectionProperties,
          headers: {
            default: this.options.header
              ? buildHeader(this.options.header, this.theme)
              : buildDefaultHeader(this.options.title, this.theme),
          },
          footers: {
            default: this.options.footer
              ? buildFooter(this.options.footer, this.theme)
              : buildDefaultFooter(this.theme),
          },
          children: [...titleParagraphs, ...paragraphs] as Paragraph[],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Build title section
   */
  private buildTitleSection(): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    if (this.options.title) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: this.options.title,
              bold: true,
              size: 56,
              font: this.theme.fonts.heading,
              color: this.theme.colors.primary,
            }),
          ],
          spacing: { after: 200 },
        })
      );

      // Add subtitle if author is provided
      if (this.options.author) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Tác giả: ${this.options.author}`,
                italics: true,
                size: 24,
                font: this.theme.fonts.body,
                color: this.theme.colors.secondary,
              }),
            ],
            spacing: { after: 400 },
          })
        );
      }
    }

    return paragraphs;
  }

  /**
   * Build section properties (page size, margins, orientation)
   */
  private buildSectionProperties() {
    const pageSize = getPageSize(this.options.pageSize);
    const margins = getMargins(this.options.margins);
    const orientation = ORIENTATIONS[this.options.orientation || 'portrait'];

    return {
      page: {
        size: {
          width: orientation === ORIENTATIONS.landscape ? pageSize.height : pageSize.width,
          height: orientation === ORIENTATIONS.landscape ? pageSize.width : pageSize.height,
          orientation,
        },
        margin: margins,
      },
    };
  }
}

// ═══════════════════════════════════════════════════
// QUICK BUILD FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Quick build - Tạo document nhanh từ markdown
 */
export async function buildWordDocument(
  content: string,
  options?: WordDocumentOptions
): Promise<Buffer> {
  const builder = new WordDocumentBuilder(options);
  return builder.build(content);
}

/**
 * Build simple document - Không có header/footer
 */
export async function buildSimpleDocument(
  content: string,
  title?: string
): Promise<Buffer> {
  const theme = getTheme();
  const paragraphs = parseExtendedContent(content, theme);

  const doc = new Document({
    creator: 'Zia AI Bot',
    title: title || 'Document',
    styles: buildDocumentStyles(theme),
    numbering: buildNumberingConfig(),
    sections: [
      {
        children: [
          ...(title
            ? [
                new Paragraph({
                  heading: HeadingLevel.TITLE,
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: title,
                      bold: true,
                      size: 56,
                      font: theme.fonts.heading,
                      color: theme.colors.primary,
                    }),
                  ],
                  spacing: { after: 400 },
                }),
              ]
            : []),
          ...paragraphs,
        ] as Paragraph[],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
