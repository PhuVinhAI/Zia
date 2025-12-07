/**
 * PPTX Handler - Tạo file PowerPoint với full features
 * Sử dụng PPTX Framework
 */

import { buildPresentation } from '../../../../../libs/pptx-builder/index.js';
import type { CreateFileParams } from '../../../../../shared/schemas/tools.schema.js';
import type { FileHandler } from './types.js';

export const pptxHandler: FileHandler = async (
  content: string,
  opts?: CreateFileParams,
): Promise<Buffer> => {
  // Build presentation using the framework
  const buffer = await buildPresentation(content, {
    title: opts?.title || opts?.filename?.replace(/\.pptx$/i, '') || 'Presentation',
    author: opts?.author || 'Zia AI Bot',
    subject: 'Created by Zia AI Bot',
    company: 'Zia AI',
    showSlideNumbers: true,
  });

  return buffer;
};
