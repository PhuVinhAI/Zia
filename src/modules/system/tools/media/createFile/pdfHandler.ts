/**
 * PDF Handler - Tạo file PDF bằng cách viết DOCX rồi convert qua ComPDF API
 * Giữ lại tất cả features của Word framework
 */

import type { CreateFileParams } from '../../../../../shared/schemas/tools.schema.js';
import { convertDocxToPdfViaApi } from '../../../services/compdfService.js';
import { docxHandler } from './docxHandler.js';
import type { FileHandler } from './types.js';

export const pdfHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  // Bước 1: Tạo DOCX buffer bằng Word framework (giữ nguyên tất cả features)
  const docxBuffer = await docxHandler(content, opts);

  // Bước 2: Convert DOCX sang PDF qua ComPDF API
  const pdfBuffer = await convertDocxToPdfViaApi(
    docxBuffer,
    opts?.filename?.replace(/\.pdf$/i, '.docx') || 'document.docx',
  );

  if (!pdfBuffer) {
    throw new Error('Không thể convert sang PDF. Vui lòng kiểm tra COMPDF_API_KEY.');
  }

  return pdfBuffer;
};
