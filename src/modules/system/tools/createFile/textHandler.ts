/**
 * Text File Handler - Xử lý các file text thuần
 */

import type { FileHandler } from './types.js';

// UTF-8 BOM để Windows nhận diện đúng encoding
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

export const textFileHandler: FileHandler = async (content: string): Promise<Buffer> => {
  const normalizedContent = content
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\t/g, '\t');

  const contentBuffer = Buffer.from(normalizedContent, 'utf-8');
  return Buffer.concat([UTF8_BOM, contentBuffer]);
};
