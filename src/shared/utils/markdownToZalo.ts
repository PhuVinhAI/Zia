/**
 * Markdown to Zalo RichText Parser
 * Parse markdown từ AI response sang Zalo RichText format
 *
 * Hỗ trợ:
 * - **bold** → Bold style
 * - *italic* → Italic style
 * - ~~strikethrough~~ → StrikeThrough style
 * - `inline code` → giữ nguyên
 * - [link](url) → text + url
 * - # Heading → Bold + Big
 * - > Blockquote → Italic
 * - Tables → render PNG
 * - Code blocks → trả về để tạo file
 */

import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { TextStyle } from '../types/zalo.types.js';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface StyleItem {
  start: number;
  len: number;
  st: number;
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface MediaImage {
  buffer: Buffer;
  filename: string;
  type: 'table' | 'mermaid';
}

export interface LinkItem {
  url: string;
  text?: string;
}

export interface ParsedMarkdown {
  text: string;
  styles: StyleItem[];
  codeBlocks: CodeBlock[];
  images: MediaImage[];
  links: LinkItem[];
}

// ═══════════════════════════════════════════════════
// TABLE TO PNG
// ═══════════════════════════════════════════════════

interface TableData {
  headers: string[];
  rows: string[][];
}

function parseMarkdownTable(tableText: string): TableData | null {
  const lines = tableText.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;

  const headers = lines[0]
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell);

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell);
    if (cells.length > 0) rows.push(cells);
  }

  return { headers, rows };
}

async function renderTableToPng(table: TableData): Promise<Buffer> {
  const { headers, rows } = table;
  const cellPadding = 16;
  const fontSize = 14;
  const headerFontSize = 15;
  const lineHeight = fontSize + cellPadding * 2;
  const headerHeight = headerFontSize + cellPadding * 2;

  // Tính độ rộng mỗi cột
  const colWidths = headers.map((h, i) => {
    const maxRowWidth = rows.reduce((max, row) => {
      return Math.max(max, (row[i] || '').length);
    }, 0);
    return Math.max(h.length, maxRowWidth) * 9 + cellPadding * 2;
  });

  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + 2;
  const totalHeight = headerHeight + rows.length * lineHeight + 2;

  const canvas = new ChartJSNodeCanvas({
    width: totalWidth,
    height: totalHeight,
    backgroundColour: 'white',
  });

  // Render bằng custom plugin
  const config: any = {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: { responsive: false },
    plugins: [{
      id: 'tableRenderer',
      beforeDraw: (chart: any) => {
        const ctx = chart.ctx;
        const w = chart.width;
        const h = chart.height;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Draw header background
        ctx.fillStyle = '#4a90d9';
        ctx.fillRect(1, 1, w - 2, headerHeight);

        // Draw header text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${headerFontSize}px Arial`;
        ctx.textBaseline = 'middle';
        let x = 1;
        headers.forEach((header, i) => {
          ctx.fillText(header, x + cellPadding, headerHeight / 2 + 1);
          x += colWidths[i];
        });

        // Draw rows
        ctx.font = `${fontSize}px Arial`;
        rows.forEach((row, rowIndex) => {
          const y = headerHeight + rowIndex * lineHeight + 1;

          // Alternate row background
          ctx.fillStyle = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff';
          ctx.fillRect(1, y, w - 2, lineHeight);

          // Row text
          ctx.fillStyle = '#333333';
          let cellX = 1;
          row.forEach((cell, colIndex) => {
            ctx.fillText(cell, cellX + cellPadding, y + lineHeight / 2);
            cellX += colWidths[colIndex];
          });
        });

        // Draw grid lines
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;

        // Vertical lines
        x = 1;
        for (let i = 0; i <= colWidths.length; i++) {
          ctx.beginPath();
          ctx.moveTo(x, 1);
          ctx.lineTo(x, h - 1);
          ctx.stroke();
          x += colWidths[i] || 0;
        }

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(1, 1);
        ctx.lineTo(w - 1, 1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(1, headerHeight + 1);
        ctx.lineTo(w - 1, headerHeight + 1);
        ctx.stroke();

        for (let i = 0; i <= rows.length; i++) {
          const y = headerHeight + i * lineHeight + 1;
          ctx.beginPath();
          ctx.moveTo(1, y);
          ctx.lineTo(w - 1, y);
          ctx.stroke();
        }

        // Border
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);
      }
    }]
  };

  return await canvas.renderToBuffer(config);
}

// ═══════════════════════════════════════════════════
// MERMAID TO PNG (via mermaid.ink API)
// ═══════════════════════════════════════════════════

import { http } from './httpClient.js';

const MERMAID_TYPES = ['flowchart', 'sequencediagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'timeline', 'graph'];

function isMermaidCode(code: string): boolean {
  const firstLine = code.trim().split('\n')[0].toLowerCase();
  return MERMAID_TYPES.some(type => firstLine.startsWith(type.toLowerCase()));
}

async function renderMermaidToPng(code: string): Promise<Buffer | null> {
  try {
    const mermaidConfig = {
      code: code.trim(),
      mermaid: { theme: 'default' },
    };
    const encoded = Buffer.from(JSON.stringify(mermaidConfig)).toString('base64url');
    const url = `https://mermaid.ink/img/${encoded}?bgColor=white`;

    const response = await http.get(url, {
      timeout: 30000,
      headers: { Accept: 'image/png' },
    });

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// EXTRACT CODE BLOCKS & TABLES
// ═══════════════════════════════════════════════════

interface ExtractResult {
  text: string;
  codeBlocks: CodeBlock[];
  tables: TableData[];
  mermaidCodes: string[];
}

/**
 * Xử lý incomplete code block (bị cắt giữa chừng khi chia tin nhắn)
 * - Nếu có ``` mở nhưng không có đóng → thêm ``` đóng
 * - Nếu có ``` đóng nhưng không có mở → thêm ``` mở
 */
function fixIncompleteCodeBlocks(markdown: string): string {
  let text = markdown;

  // Đếm số lượng ``` trong text
  const backtickMatches = text.match(/```/g);
  const backtickCount = backtickMatches ? backtickMatches.length : 0;

  // Nếu số lượng ``` lẻ, có incomplete block
  if (backtickCount % 2 !== 0) {
    // Tìm vị trí ``` đầu tiên và cuối cùng
    const firstBacktick = text.indexOf('```');
    const lastBacktick = text.lastIndexOf('```');

    if (firstBacktick === lastBacktick) {
      // Chỉ có 1 ```, kiểm tra xem là mở hay đóng
      const beforeBacktick = text.slice(0, firstBacktick);
      const afterBacktick = text.slice(firstBacktick + 3);

      // Nếu sau ``` có language tag hoặc code → đây là mở, cần thêm đóng
      if (afterBacktick.trim().length > 0) {
        text = text + '\n```';
      } else {
        // Đây là đóng, cần thêm mở ở đầu
        text = '```\n' + text;
      }
    }
  }

  return text;
}

/**
 * Xử lý incomplete table (bị cắt giữa chừng)
 * Table cần ít nhất: header row + separator row
 */
function fixIncompleteTables(markdown: string): string {
  let text = markdown;

  // Tìm các dòng bắt đầu bằng | nhưng không phải table hoàn chỉnh
  const lines = text.split('\n');
  const tableStartPattern = /^\|[^|]+\|$/;
  const tableSeparatorPattern = /^\|[-:\s|]+\|$/;

  let inPotentialTable = false;
  let tableStartIndex = -1;
  let hasSeparator = false;
  let hasDataRows = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (tableStartPattern.test(line) && !inPotentialTable) {
      inPotentialTable = true;
      tableStartIndex = i;
      hasSeparator = false;
      hasDataRows = false;
    } else if (inPotentialTable) {
      if (tableSeparatorPattern.test(line)) {
        hasSeparator = true;
      } else if (tableStartPattern.test(line) && hasSeparator) {
        hasDataRows = true;
      } else if (!tableStartPattern.test(line)) {
        // Kết thúc potential table
        if (inPotentialTable && tableStartIndex >= 0) {
          // Nếu có header nhưng không có separator hoặc data → incomplete
          if (!hasSeparator || !hasDataRows) {
            // Giữ nguyên dạng text, không parse thành table
            // (sẽ hiển thị như text bình thường)
          }
        }
        inPotentialTable = false;
        tableStartIndex = -1;
      }
    }
  }

  return text;
}

function extractCodeBlocksAndTables(markdown: string): ExtractResult {
  const codeBlocks: CodeBlock[] = [];
  const tables: TableData[] = [];
  const mermaidCodes: string[] = [];

  // Fix incomplete blocks trước khi extract
  let text = fixIncompleteCodeBlocks(markdown);
  text = fixIncompleteTables(text);

  // Extract code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  text = text.replace(codeBlockRegex, (_, language, code) => {
    const lang = (language || '').toLowerCase();
    const trimmedCode = code.trim();

    // Check if it's mermaid code
    if (lang === 'mermaid' || isMermaidCode(trimmedCode)) {
      mermaidCodes.push(trimmedCode);
      return `\n📊 [Sơ đồ ${mermaidCodes.length}]\n`;
    }

    codeBlocks.push({ language: language || 'txt', code: trimmedCode });
    return `\n📄 [Code: ${language || 'text'}]\n`;
  });

  // Extract tables
  const tableRegex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g;
  text = text.replace(tableRegex, (tableMatch) => {
    const tableData = parseMarkdownTable(tableMatch);
    if (tableData && tableData.headers.length > 0) {
      tables.push(tableData);
      return `\n📊 [Bảng ${tables.length}]\n`;
    }
    return tableMatch;
  });

  return { text, codeBlocks, tables, mermaidCodes };
}

// ═══════════════════════════════════════════════════
// INLINE MARKDOWN TO ZALO STYLES
// ═══════════════════════════════════════════════════

function parseInlineStyles(text: string): { text: string; styles: StyleItem[]; links: LinkItem[] } {
  const styles: StyleItem[] = [];
  const links: LinkItem[] = [];
  let result = text;

  const patterns: Array<{ regex: RegExp; style: number }> = [
    { regex: /\*\*\*(.+?)\*\*\*/g, style: TextStyle.Bold | TextStyle.Italic },
    { regex: /\*\*(.+?)\*\*/g, style: TextStyle.Bold },
    { regex: /~~(.+?)~~/g, style: TextStyle.StrikeThrough },
    { regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, style: TextStyle.Italic },
    { regex: /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, style: TextStyle.Italic },
    { regex: /^#{1,3}\s+(.+)$/gm, style: TextStyle.Bold | TextStyle.Big },
    { regex: /^>\s*(.+)$/gm, style: TextStyle.Italic },
  ];

  for (const { regex, style } of patterns) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(result)) !== null) {
      const fullMatch = match[0];
      const content = match[1];
      const startIndex = match.index;

      result = result.slice(0, startIndex) + content + result.slice(startIndex + fullMatch.length);
      styles.push({ start: startIndex, len: content.length, st: style });
      regex.lastIndex = 0;
    }
  }

  // Handle markdown links [text](url) - extract và replace bằng text có style
  // Dedupe: chỉ gửi mỗi URL một lần
  const seenUrls = new Set<string>();
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch: RegExpExecArray | null;
  linkRegex.lastIndex = 0;

  while ((linkMatch = linkRegex.exec(result)) !== null) {
    const fullMatch = linkMatch[0];
    const linkText = linkMatch[1];
    const url = linkMatch[2];
    const startIndex = linkMatch.index;

    // Chỉ thêm link nếu URL hợp lệ (bắt đầu bằng http) và chưa gửi
    if (url.startsWith('http') && !seenUrls.has(url)) {
      seenUrls.add(url);
      links.push({ url, text: linkText });
    }

    // Replace bằng text có style underline
    result = result.slice(0, startIndex) + linkText + result.slice(startIndex + fullMatch.length);
    styles.push({ start: startIndex, len: linkText.length, st: TextStyle.Blue | TextStyle.Underline });
    linkRegex.lastIndex = 0;
  }

  // Handle bare URLs (http:// hoặc https://)
  const bareUrlRegex = /(?<!\()(https?:\/\/[^\s\)]+)/g;
  let bareMatch: RegExpExecArray | null;
  bareUrlRegex.lastIndex = 0;

  while ((bareMatch = bareUrlRegex.exec(result)) !== null) {
    const url = bareMatch[1];
    const startIndex = bareMatch.index;

    // Chỉ thêm vào links nếu chưa có (dedupe)
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      links.push({ url });
    }

    // Style cho URL
    styles.push({ start: startIndex, len: url.length, st: TextStyle.Blue | TextStyle.Underline });
    bareUrlRegex.lastIndex = bareMatch.index + url.length;
  }

  result = result.replace(/\n{3,}/g, '\n\n');
  return { text: result.trim(), styles, links };
}

// ═══════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════

export async function parseMarkdownToZalo(markdown: string): Promise<ParsedMarkdown> {
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\\n/g, '\n');
  const { text: withoutCodeAndTables, codeBlocks, tables, mermaidCodes } = extractCodeBlocksAndTables(normalized);
  const { text: finalText, styles, links } = parseInlineStyles(withoutCodeAndTables);

  const images: MediaImage[] = [];

  // Render tables to PNG
  for (let i = 0; i < tables.length; i++) {
    const buffer = await renderTableToPng(tables[i]);
    images.push({ buffer, filename: `table_${Date.now()}_${i}.png`, type: 'table' });
  }

  // Render mermaid diagrams to PNG
  for (let i = 0; i < mermaidCodes.length; i++) {
    const buffer = await renderMermaidToPng(mermaidCodes[i]);
    if (buffer) {
      images.push({ buffer, filename: `diagram_${Date.now()}_${i}.png`, type: 'mermaid' });
    }
  }

  return { text: finalText, styles, codeBlocks, images, links };
}

export function getFileExtension(language: string): string {
  const map: Record<string, string> = {
    javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
    cpp: 'cpp', c: 'c', csharp: 'cs', go: 'go', rust: 'rs', ruby: 'rb',
    php: 'php', swift: 'swift', kotlin: 'kt', html: 'html', css: 'css',
    json: 'json', yaml: 'yaml', yml: 'yml', xml: 'xml', sql: 'sql',
    bash: 'sh', shell: 'sh', sh: 'sh', markdown: 'md', md: 'md', txt: 'txt',
  };
  return map[language.toLowerCase()] || language || 'txt';
}
