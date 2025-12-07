/**
 * Types & Constants cho createFile tool
 */

import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';

export type FileHandler = (content: string, options?: CreateFileParams) => Promise<Buffer>;

export const MIME_TYPES: Record<string, string> = {
  // Office documents
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};
