/**
 * DOCX Handler - Tạo file Word với framework xịn
 * Hỗ trợ: themes, tables, callouts, header/footer, page settings
 */

import {
  buildWordDocument,
  getTheme,
  type WordDocumentOptions,
} from '../../../../libs/docx-builder/index.js';
import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';
import type { FileHandler } from './types.js';

/**
 * Parse extended options từ content
 * Syntax: <!--OPTIONS: {...} -->
 */
function parseOptionsFromContent(content: string): {
  cleanContent: string;
  options: Partial<WordDocumentOptions>;
} {
  const optionsMatch = content.match(/<!--OPTIONS:\s*(\{[\s\S]*?\})\s*-->/);

  if (!optionsMatch) {
    return { cleanContent: content, options: {} };
  }

  try {
    const options = JSON.parse(optionsMatch[1]) as Partial<WordDocumentOptions>;
    const cleanContent = content.replace(optionsMatch[0], '').trim();
    return { cleanContent, options };
  } catch {
    return { cleanContent: content, options: {} };
  }
}

export const docxHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  // Parse inline options từ content
  const { cleanContent, options: inlineOptions } = parseOptionsFromContent(content);

  // Merge options
  const documentOptions: WordDocumentOptions = {
    ...opts,
    ...inlineOptions,
    title: inlineOptions.title || opts?.title,
    author: inlineOptions.author || opts?.author,
    theme: inlineOptions.theme || getTheme('default'),
  };

  return await buildWordDocument(cleanContent, documentOptions);
};
