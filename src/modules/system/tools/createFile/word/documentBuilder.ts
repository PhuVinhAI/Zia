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
import { parseExtendedContent } from './contentBuilder.js';
import { buildDefaultFooter, buildDefaultHeader, buildFooter, buildHeader } from './headerFooter.js';
import { buildManualTOC, extractHeadings } from './tocBuilder.js';
import { parseChecklist, buildChecklist } from './listBuilder.js';

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
    // Pre-process content for special features
    let processedContent = content;
    const allChildren: Paragraph[] = [];

    // Build title if provided
    const titleParagraphs = this.buildTitleSection();
    allChildren.push(...titleParagraphs);

    // Build TOC if requested
    if (this.options.includeToc) {
      const headings = extractHeadings(content);
      if (headings.length > 0) {
        const tocParagraphs = buildManualTOC(headings, this.options.tocTitle, this.theme);
        allChildren.push(...tocParagraphs);
      }
    }

    // Check for checklist items and process them
    const checklistItems = parseChecklist(processedContent);
    if (checklistItems.length > 0) {
      // Remove checklist lines from content to avoid double processing
      const checklistRegex = /^(\s*)[-*]\s*\[([ xX])\]\s*(.+)$/gm;
      processedContent = processedContent.replace(checklistRegex, '');
    }

    // Parse main content
    const paragraphs = parseExtendedContent(processedContent, this.theme);
    allChildren.push(...(paragraphs as Paragraph[]));

    // Add checklist items at the end if any
    if (checklistItems.length > 0) {
      const checklistParagraphs = buildChecklist(checklistItems, this.theme);
      allChildren.push(...checklistParagraphs);
    }

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
          children: allChildren,
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
