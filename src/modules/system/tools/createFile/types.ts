/**
 * Types & Constants cho createFile tool
 */

import type { CreateFileParams } from '../../../../shared/schemas/tools.schema.js';

export type FileHandler = (content: string, options?: CreateFileParams) => Promise<Buffer>;

export const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yaml: 'application/x-yaml',
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  py: 'text/x-python',
  sql: 'application/sql',
};
