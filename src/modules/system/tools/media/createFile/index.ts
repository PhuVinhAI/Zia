/**
 * Tool: createFile - Tạo và gửi file Office qua Zalo
 * Hỗ trợ: docx (Word), pdf, pptx (PowerPoint), xlsx (Excel)
 */

import type { ITool, ToolResult } from '../../../../../core/types.js';
import {
  type CreateFileParams,
  CreateFileSchema,
  validateParamsWithExample,
} from '../../../../../shared/schemas/tools.schema.js';
import { docxHandler } from './docxHandler.js';
import { pdfHandler } from './pdfHandler.js';
import { pptxHandler } from './pptxHandler.js';
import { type FileHandler, MIME_TYPES } from './types.js';
import { xlsxHandler } from './xlsxHandler.js';

const FILE_HANDLERS: Record<string, FileHandler> = {
  docx: docxHandler,
  pdf: pdfHandler,
  pptx: pptxHandler,
  xlsx: xlsxHandler,
};

const SUPPORTED_EXTENSIONS = Object.keys(FILE_HANDLERS);

export const createFileTool: ITool = {
  name: 'createFile',
  description: `Tạo file Office chuyên nghiệp. Hỗ trợ: docx, pdf, pptx, xlsx

═══════════════════════════════════════════════════
DOCX WORD FRAMEWORK - FULL FEATURES
═══════════════════════════════════════════════════

**CƠ BẢN (Markdown chuẩn):**
# Heading 1
## Heading 2  
### Heading 3
**bold**, *italic*, ~~strikethrough~~, \`inline code\`
- Bullet list
1. Numbered list
> Blockquote
\`\`\`language
code block
\`\`\`

**TABLES:**
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | **Bold** | *Italic* |

**DIVIDERS:**
[DIVIDER] - đường kẻ đơn
[DIVIDER:double] - đường kẻ đôi
[DIVIDER:dashed] - đứt nét
[DIVIDER:dotted] - chấm chấm
[DIVIDER:decorated:Tiêu đề] - có text giữa
[DIVIDER:star] - hoa văn sao
[DIVIDER:floral] - hoa văn hoa

**HIGHLIGHTS:**
==text vàng== hoặc [HIGHLIGHT:green]text xanh[/HIGHLIGHT]
Colors: yellow, green, cyan, magenta, blue, red

**MATH:** (LaTeX cơ bản)
$E=mc^2$ inline
$$\\sum_{i=1}^{n} x_i$$ block
Hỗ trợ: \\alpha \\beta \\pi \\sum \\int \\infty ^2 _n \\frac{1}{2}

**ALIGNMENT:**
->Text căn giữa<-
->Text căn phải

**COVER PAGE:**
[COVER:Tiêu đề:Phụ đề:Tác giả:Tổ chức:Ngày:Version:Style]
Styles: simple, professional, academic, modern

**PAGE BREAK:**
[PAGE_BREAK] hoặc ---PAGE---

**IMAGES:**
![alt text](base64data)
[IMAGE:base64,width=400,height=300,caption="Chú thích"]

**FOOTNOTES:**
Text có chú thích[^1]
[^1]: Nội dung chú thích

**COLUMNS:**
[COLUMNS:2]
Nội dung 2 cột
[/COLUMNS]

═══════════════════════════════════════════════════
OPTIONS (đặt ở ĐẦU content)
═══════════════════════════════════════════════════
<!--OPTIONS: {
  "theme": {"name": "professional", "spacing": {"lineSpacing": 360}},
  "pageSize": "A4",
  "orientation": "portrait",
  "margins": {"top": 1440, "bottom": 1440, "left": 1440, "right": 1440},
  "header": {"text": "Header", "alignment": "center", "includePageNumber": true},
  "footer": {"text": "Footer", "alignment": "center"},
  "includeToc": true,
  "tocTitle": "Mục Lục"
} -->

**Chi tiết OPTIONS:**
- theme.name: default, professional, modern, academic, minimal
- theme.spacing: {paragraphAfter, headingBefore, headingAfter, listItemAfter, lineSpacing}
  + lineSpacing: 240=single, 276=1.15, 360=1.5, 480=double
- pageSize: A4, Letter, Legal
- orientation: portrait, landscape
- margins: {top, bottom, left, right} (twips, 1440 = 1 inch)
- header/footer: {text, alignment (left/center/right), includePageNumber}
- includeToc: true/false - tự động tạo mục lục từ headings

═══════════════════════════════════════════════════
PPTX POWERPOINT FRAMEWORK
═══════════════════════════════════════════════════

**SLIDE TYPES:**
[SLIDE:title] - Slide tiêu đề
[SLIDE:section] - Slide section header
[SLIDE:content] - Slide nội dung (mặc định)
[SLIDE:quote] - Slide trích dẫn
[SLIDE:imageOnly] - Slide chỉ hình ảnh
[SLIDE:thankyou] - Slide cảm ơn

**TÁCH SLIDES:**
--- hoặc *** hoặc ___ hoặc [SLIDE] hoặc [NEW_SLIDE]

**CƠ BẢN:**
# Tiêu đề slide (tự động tạo slide mới)
## Phụ đề
- Bullet point
  - Nested bullet
1. Numbered list
- [ ] Checklist unchecked
- [x] Checklist checked

**TABLES:**
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

**CODE BLOCKS:**
\`\`\`javascript
const x = 1;
\`\`\`

**QUOTES:**
> Blockquote text
[QUOTE:Nội dung quote:Tác giả]

**IMAGES:**
![Alt](url) hoặc [IMAGE:base64,width=400,caption="Caption"]

**THEMES (10 có sẵn):**
default, professional, modern, dark, minimal, corporate, creative, nature, tech, elegant

**OPTIONS:**
<!--OPTIONS: {
  "title": "Presentation",
  "author": "Author",
  "theme": {"name": "professional"},
  "layout": "LAYOUT_16x9",
  "showSlideNumbers": true
} -->

**LAYOUTS:**
LAYOUT_16x9 (default), LAYOUT_16x10, LAYOUT_4x3, LAYOUT_WIDE

═══════════════════════════════════════════════════
XLSX EXCEL
═══════════════════════════════════════════════════
Dùng markdown table hoặc CSV format

═══════════════════════════════════════════════════
LƯU Ý QUAN TRỌNG
═══════════════════════════════════════════════════
- Viết markdown bình thường, framework tự style đẹp
- Dùng \\n cho xuống dòng trong JSON string
- Không cần escape ký tự đặc biệt trong content`,
  parameters: [
    {
      name: 'filename',
      type: 'string',
      description: 'Tên file KÈM ĐUÔI (.docx, .pdf, .pptx, .xlsx)',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'Nội dung markdown. Dùng \\n cho xuống dòng.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề tài liệu (header)',
      required: false,
    },
    {
      name: 'author',
      type: 'string',
      description: 'Tên tác giả',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    const validation = validateParamsWithExample(CreateFileSchema, params, 'createFile');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data as CreateFileParams;

    try {
      const ext = data.filename.split('.').pop()?.toLowerCase() || '';
      const handler = FILE_HANDLERS[ext];

      if (!handler) {
        return {
          success: false,
          error: `Định dạng "${ext}" không được hỗ trợ. Chỉ hỗ trợ: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
        };
      }

      const buffer = await handler(data.content, data);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      return {
        success: true,
        data: {
          fileBuffer: buffer,
          filename: data.filename,
          mimeType,
          fileSize: buffer.length,
          fileType: ext,
          title: data.title,
          author: data.author,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo file: ${error.message}` };
    }
  },
};
