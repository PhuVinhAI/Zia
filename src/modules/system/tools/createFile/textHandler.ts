/**
 * Text File Handler - Xử lý các file text thuần
 */

import type { FileHandler } from './types.js';

export const textFileHandler: FileHandler = async (content: string): Promise<Buffer> => {
  const normalizedContent = content
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\t/g, '\t');
  return Buffer.from(normalizedContent, 'utf-8');
};
