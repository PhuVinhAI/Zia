/**
 * DOCX Handler - Tao file Word voi markdown support
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  TextRun,
} from 'docx';
import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';
import {
  type Block,
  hasStyle,
  type InlineToken,
  parseMarkdown,
} from '../../../../shared/utils/markdownParser.js';
import type { FileHandler } from './types.js';

function tokensToTextRuns(tokens: InlineToken[]): (TextRun | ExternalHyperlink)[] {
  return tokens.map((token) => {
    const isBold = hasStyle(token, 'bold') || hasStyle(token, 'boldItalic');
    const isItalic = hasStyle(token, 'italic') || hasStyle(token, 'boldItalic');
    const isStrike = hasStyle(token, 'strikethrough');
    const isCode = hasStyle(token, 'code');
    const isLink = hasStyle(token, 'link');
    if (isLink && token.href) {
      return new ExternalHyperlink({
        children: [
          new TextRun({
            text: token.text,
            style: 'Hyperlink',
            color: '0563C1',
            underline: { type: 'single' },
          }),
        ],
        link: token.href,
      });
    }
    return new TextRun({
      text: token.text,
      bold: isBold,
      italics: isItalic,
      strike: isStrike,
      font: isCode ? 'Consolas' : undefined,
      shading: isCode ? { type: ShadingType.SOLID, color: 'E8E8E8' } : undefined,
    });
  });
}

function blockToParagraph(block: Block): Paragraph | null {
  const headingMap: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    heading1: HeadingLevel.HEADING_1,
    heading2: HeadingLevel.HEADING_2,
    heading3: HeadingLevel.HEADING_3,
    heading4: HeadingLevel.HEADING_4,
  };
  switch (block.type) {
    case 'empty':
      return new Paragraph({ spacing: { after: 200 } });
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4':
      return new Paragraph({
        heading: headingMap[block.type],
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { before: 280, after: 140 },
      });
    case 'bullet':
      return new Paragraph({
        bullet: { level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 80 },
      });
    case 'numbered':
      return new Paragraph({
        numbering: { reference: 'default-numbering', level: block.indent || 0 },
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 80 },
      });
    case 'blockquote':
      return new Paragraph({
        children: tokensToTextRuns(block.tokens) as TextRun[],
        indent: { left: 720 },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'CCCCCC' } },
        spacing: { after: 120 },
      });
    case 'codeBlock':
      return new Paragraph({
        children: [new TextRun({ text: block.raw || '', font: 'Consolas', size: 20 })],
        shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
        spacing: { before: 120, after: 120 },
      });
    case 'hr':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        spacing: { before: 200, after: 200 },
      });
    default:
      return new Paragraph({
        children: tokensToTextRuns(block.tokens) as TextRun[],
        spacing: { after: 120 },
      });
  }
}

export const docxHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  const blocks = parseMarkdown(content);
  const paragraphs = blocks.map(blockToParagraph).filter((p): p is Paragraph => p !== null);
  const doc = new Document({
    creator: opts?.author || 'Zia AI Bot',
    title: opts?.title || opts?.filename || 'Document',
    description: 'Created by Zia AI Bot',
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START },
            { level: 1, format: 'lowerLetter', text: '%2)', alignment: AlignmentType.START },
            { level: 2, format: 'lowerRoman', text: '%3.', alignment: AlignmentType.START },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          ...(opts?.title
            ? [
                new Paragraph({
                  heading: HeadingLevel.TITLE,
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: opts.title, bold: true, size: 48 })],
                  spacing: { after: 400 },
                }),
              ]
            : []),
          ...paragraphs,
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
};
