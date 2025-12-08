/**
 * Integration Test: Local DOCX to PDF Conversion
 * Test chuyển đổi DOCX sang PDF nội bộ (mammoth + pdfkit)
 * Không cần API key
 */

import { describe, test, expect } from 'bun:test';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx';
import {
  convertDocxToPdfLocal,
  convertDocxToPdfBase64Local,
} from '../../../src/modules/media/services/docxToPdfService.js';

/**
 * Helper: Tạo DOCX buffer đơn giản để test
 */
async function createTestDocx(content: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: content, size: 24 })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Helper: Tạo 1x1 pixel PNG image buffer
 */
function createTestImageBuffer(): Buffer {
  // Minimal 1x1 red PNG
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

describe('Local DOCX to PDF Conversion', () => {
  test('convertDocxToPdfLocal - chuyển đổi DOCX đơn giản', async () => {
    const docxBuffer = await createTestDocx('Hello World - Test Document');

    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer!.length).toBeGreaterThan(100);

    // Check PDF magic bytes (%PDF)
    const header = pdfBuffer!.slice(0, 4).toString();
    expect(header).toBe('%PDF');
  });

  test('convertDocxToPdfLocal - với nội dung tiếng Việt', async () => {
    const docxBuffer = await createTestDocx('Xin chào Việt Nam! Đây là tài liệu test.');

    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
  });

  test('convertDocxToPdfBase64Local - trả về base64', async () => {
    const docxBuffer = await createTestDocx('Base64 Test Document');

    const base64 = await convertDocxToPdfBase64Local(docxBuffer);

    expect(base64).not.toBeNull();
    expect(typeof base64).toBe('string');
    expect(base64!.length).toBeGreaterThan(100);

    // Verify it's valid base64
    const decoded = Buffer.from(base64!, 'base64');
    expect(decoded.slice(0, 4).toString()).toBe('%PDF');
  });

  test('convertDocxToPdfLocal - với document có formatting', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Document Title', bold: true, size: 32 }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: '' })],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'This is the first paragraph with ' }),
                new TextRun({ text: 'bold text', bold: true }),
                new TextRun({ text: ' and ' }),
                new TextRun({ text: 'italic text', italics: true }),
                new TextRun({ text: '.' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Second paragraph with different formatting.',
                  size: 20,
                }),
              ],
            }),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
    expect(pdfBuffer!.length).toBeGreaterThan(500);
  });

  test('convertDocxToPdfLocal - với headings', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Heading 1',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: 'Some content under heading 1',
            }),
            new Paragraph({
              text: 'Heading 2',
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: 'Some content under heading 2',
            }),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
  });

  test('convertDocxToPdfLocal - với hình ảnh', async () => {
    const imageBuffer = createTestImageBuffer();

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Document with Image' })],
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 100, height: 100 },
                  type: 'png',
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Text after image' })],
            }),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
    // PDF with image should be larger
    expect(pdfBuffer!.length).toBeGreaterThan(1000);
  });

  test('convertDocxToPdfLocal - với list items', async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'List Title',
            }),
            new Paragraph({
              text: 'Item 1',
              bullet: { level: 0 },
            }),
            new Paragraph({
              text: 'Item 2',
              bullet: { level: 0 },
            }),
            new Paragraph({
              text: 'Item 3',
              bullet: { level: 0 },
            }),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const pdfBuffer = await convertDocxToPdfLocal(docxBuffer);

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
  });
});
