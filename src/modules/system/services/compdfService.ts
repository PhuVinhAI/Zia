/**
 * ComPDF Service - Convert DOCX to PDF via ComPDF API
 * API: https://api-server.compdf.com/server/v2/process/docx/pdf
 */

import { debugLog, logError } from '../../../core/logger/logger.js';
import { createHttpClient } from '../../../shared/utils/httpClient.js';

const COMPDF_API_URL = 'https://api-server.compdf.com/server/v2/process/docx/pdf';
const COMPDF_API_KEY = process.env.COMPDF_API_KEY || '';

interface ComPDFFileInfo {
  fileKey: string;
  taskId: string;
  fileName: string;
  downFileName: string;
  fileUrl: string;
  downloadUrl: string;
  sourceType: string;
  targetType: string;
  fileSize: number;
  convertSize: number;
  convertTime: number;
  status: string;
  failureCode: string;
  failureReason: string;
}

interface ComPDFResponse {
  code: string;
  msg: string;
  data: {
    taskId: string;
    taskFileNum: number;
    taskSuccessNum: number;
    taskFailNum: number;
    taskStatus: string;
    assetTypeId: number;
    taskCost: number;
    taskTime: number;
    sourceType: string;
    targetType: string;
    fileInfoDTOList: ComPDFFileInfo[];
  };
}

/**
 * Convert DOCX buffer to PDF buffer via ComPDF API
 */
export async function convertDocxToPdfViaApi(
  docxBuffer: Buffer,
  filename = 'document.docx',
): Promise<Buffer | null> {
  if (!COMPDF_API_KEY) {
    logError('ComPDF', 'COMPDF_API_KEY not configured');
    return null;
  }

  try {
    debugLog('ComPDF', `Converting ${filename} (${(docxBuffer.length / 1024).toFixed(1)}KB)...`);

    // Tạo FormData (native) - convert Buffer to ArrayBuffer for Blob compatibility
    const formData = new FormData();
    const arrayBuffer = docxBuffer.buffer.slice(
      docxBuffer.byteOffset,
      docxBuffer.byteOffset + docxBuffer.byteLength,
    ) as ArrayBuffer;
    formData.append(
      'file',
      new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename,
    );
    formData.append('password', '');
    formData.append('language', '1');

    // Gọi API
    const http = createHttpClient({ timeout: 120_000 });
    const response = await http.post(COMPDF_API_URL, {
      body: formData,
      headers: {
        'x-api-key': COMPDF_API_KEY,
        Accept: '*/*',
      },
    });

    // Parse JSON response
    const result = (await response.json()) as ComPDFResponse;

    if (result.code !== '200') {
      logError('ComPDF', `API error: ${result.msg || result.code}`);
      return null;
    }

    if (result.code !== '200') {
      logError('ComPDF', `API error: ${result.msg || result.code}`);
      return null;
    }

    // Lấy download URL
    const fileInfo = result.data?.fileInfoDTOList?.[0];
    if (!fileInfo?.downloadUrl) {
      logError('ComPDF', 'No download URL in response');
      return null;
    }

    debugLog('ComPDF', `Downloading PDF from: ${fileInfo.downloadUrl.substring(0, 60)}...`);

    // Download PDF
    const pdfResponse = await http.get(fileInfo.downloadUrl);
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    debugLog('ComPDF', `✓ Converted: ${(pdfBuffer.length / 1024).toFixed(1)}KB PDF`);
    return pdfBuffer;
  } catch (e: any) {
    logError('ComPDF', e);
    return null;
  }
}

/**
 * Convert DOCX buffer to PDF base64 via ComPDF API
 */
export async function convertDocxToPdfBase64ViaApi(
  docxBuffer: Buffer,
  filename = 'document.docx',
): Promise<string | null> {
  const pdfBuffer = await convertDocxToPdfViaApi(docxBuffer, filename);
  if (!pdfBuffer) return null;
  return pdfBuffer.toString('base64');
}
