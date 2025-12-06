/**
 * Integration Test: ComPDF DOCX to PDF Conversion
 * Test các chức năng chuyển đổi DOCX sang PDF
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import {
  convertDocxToPdfViaApi,
  convertDocxToPdfBase64ViaApi,
} from '../../../src/modules/system/services/compdfService.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('compdf');

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

describe.skipIf(SKIP)('ComPDF Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping ComPDF tests: COMPDF_API_KEY not configured');
  });

  test('convertDocxToPdfViaApi - chuyển đổi DOCX đơn giản', async () => {
    const docxBuffer = await createTestDocx('Hello World - Test Document');

    const pdfBuffer = await convertDocxToPdfViaApi(docxBuffer, 'test.docx');

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer!.length).toBeGreaterThan(100);

    // Check PDF magic bytes (%PDF)
    const header = pdfBuffer!.slice(0, 4).toString();
    expect(header).toBe('%PDF');
  }, 120000); // 2 minutes timeout for API

  test('convertDocxToPdfViaApi - với nội dung tiếng Việt', async () => {
    const docxBuffer = await createTestDocx('Xin chào Việt Nam! Đây là tài liệu test.');

    const pdfBuffer = await convertDocxToPdfViaApi(docxBuffer, 'vietnamese.docx');

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
  }, 120000);

  test('convertDocxToPdfBase64ViaApi - trả về base64', async () => {
    const docxBuffer = await createTestDocx('Base64 Test Document');

    const base64 = await convertDocxToPdfBase64ViaApi(docxBuffer, 'base64test.docx');

    expect(base64).not.toBeNull();
    expect(typeof base64).toBe('string');
    expect(base64!.length).toBeGreaterThan(100);

    // Verify it's valid base64
    const decoded = Buffer.from(base64!, 'base64');
    expect(decoded.slice(0, 4).toString()).toBe('%PDF');
  }, 120000);

  test('convertDocxToPdfViaApi - với document phức tạp hơn', async () => {
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
    const pdfBuffer = await convertDocxToPdfViaApi(docxBuffer, 'complex.docx');

    expect(pdfBuffer).not.toBeNull();
    expect(pdfBuffer!.slice(0, 4).toString()).toBe('%PDF');
    // Complex doc should produce larger PDF
    expect(pdfBuffer!.length).toBeGreaterThan(500);
  }, 120000);
});
