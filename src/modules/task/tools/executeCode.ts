/**
 * Tool: executeCode - Chạy code Python/JS/TS trong E2B sandbox an toàn
 * Sử dụng E2B Code Interpreter để thực thi code trong môi trường cách ly
 */

import { Sandbox } from '@e2b/code-interpreter';
import { z } from 'zod';
import type { ITool, ToolResult } from '../../../core/types.js';
import { validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';

export const ExecuteCodeSchema = z.object({
  code: z.string().min(1, 'Thiếu code cần chạy').max(50000, 'Code quá dài (tối đa 50000 ký tự)'),
  language: z.enum(['python', 'javascript', 'typescript', 'r', 'java']).default('python'),
  timeout: z.coerce.number().min(5000).max(120000).default(60000), // Tăng default lên 60s cho network requests
  packages: z.array(z.string()).optional(),
});

export type ExecuteCodeParams = z.infer<typeof ExecuteCodeSchema>;

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  javascript: 'js',
  typescript: 'ts',
  r: 'r',
  java: 'java',
};

const INSTALL_COMMANDS: Record<string, (pkg: string) => string> = {
  python: (pkg) => `pip install ${pkg}`,
  javascript: (pkg) => `npm install ${pkg}`,
  typescript: (pkg) => `npm install ${pkg}`,
  r: (pkg) => `R -e "install.packages('${pkg}', repos='https://cran.rstudio.com/')"`,
  java: () => '', // Java packages handled differently
};

/**
 * Wrap code JS/TS với async IIFE để đảm bảo top-level await hoạt động
 * và đợi tất cả promises hoàn tất
 */
function wrapAsyncCode(code: string, language: string): string {
  if (language !== 'javascript' && language !== 'typescript') {
    return code;
  }

  // Nếu code đã có async wrapper hoặc không có await/fetch/Promise, không cần wrap
  const hasAsyncPatterns = /\b(await|fetch|Promise|\.then\(|async\s+function|async\s*\()/i.test(
    code,
  );
  const alreadyWrapped = /^\s*\(async\s*\(\)\s*=>\s*\{/.test(code);

  if (!hasAsyncPatterns || alreadyWrapped) {
    return code;
  }

  // Wrap với async IIFE
  return `(async () => {
${code}
})().catch(e => console.error('Async error:', e));`;
}

async function installPackages(
  sandbox: Sandbox,
  packages: string[],
  language: string,
): Promise<string[]> {
  const logs: string[] = [];
  const getCmd = INSTALL_COMMANDS[language];
  if (!getCmd) return logs;

  for (const pkg of packages) {
    const cmd = getCmd(pkg);
    if (!cmd) continue;
    try {
      const _result = await sandbox.commands.run(cmd, { timeoutMs: 60000 });
      logs.push(`✓ Installed ${pkg}`);
    } catch (err) {
      logs.push(`✗ Failed to install ${pkg}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }
  return logs;
}

function formatExecutionResult(execution: any): {
  output: string;
  logs: { stdout: string[]; stderr: string[] };
  error: string | null;
  results: any[];
  hasChart: boolean;
} {
  const output = execution.text || '';
  const logs = {
    stdout: execution.logs?.stdout || [],
    stderr: execution.logs?.stderr || [],
  };
  const error = execution.error ? `${execution.error.name}: ${execution.error.message}` : null;
  const results = execution.results || [];
  const hasChart = results.some(
    (r: any) => r.png || r.jpeg || r.svg || r.html || r.type === 'image',
  );

  return { output, logs, error, results, hasChart };
}

export const executeCodeTool: ITool = {
  name: 'executeCode',
  description: `Chạy code trong sandbox E2B an toàn. Hỗ trợ Python, JavaScript, TypeScript, R, Java.

⚠️ CHỈ DÙNG KHI:
- User YÊU CẦU RÕ RÀNG chạy/test code cụ thể
- Test thuật toán do user viết

❌ KHÔNG DÙNG CHO:
- Tạo file code -> Sài markdown mà tạo

**THAM SỐ:**
- code: Code cần chạy (bắt buộc)
- language: python | javascript | typescript | r | java (mặc định: python)
- timeout: Thời gian chờ tối đa (ms), 5000-120000, mặc định 30000
- packages: Danh sách packages cần cài trước khi chạy (optional)

**VÍ DỤ:**
- Python: print("Hello"), pandas analysis, matplotlib charts
- JS/TS: console.log(), fetch API, async/await
- Có thể cài packages: ["pandas", "numpy", "matplotlib"]`,

  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'Code cần thực thi',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
      description: 'Ngôn ngữ: python | javascript | typescript | r | java',
      required: false,
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Timeout (ms), mặc định 30000',
      required: false,
    },
    {
      name: 'packages',
      type: 'object',
      description: 'Danh sách packages cần cài (array of strings)',
      required: false,
    },
  ],

  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const validation = validateParamsWithExample(ExecuteCodeSchema, params, 'executeCode');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { code, language, timeout, packages } = validation.data;
    const apiKey = process.env.E2B_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: 'Thiếu E2B_API_KEY trong environment variables',
      };
    }

    let sandbox: Sandbox | null = null;

    try {
      // Tạo sandbox
      sandbox = await Sandbox.create({ apiKey });

      const installLogs: string[] = [];

      // Cài packages nếu có
      if (packages && packages.length > 0) {
        const logs = await installPackages(sandbox, packages, language);
        installLogs.push(...logs);
      }

      // Wrap code nếu cần (cho JS/TS async)
      const wrappedCode = wrapAsyncCode(code, language);

      // Chạy code
      const execution = await sandbox.runCode(wrappedCode, {
        language: LANGUAGE_MAP[language] || 'python',
        timeoutMs: timeout,
      });

      const result = formatExecutionResult(execution);

      // Xử lý kết quả có hình ảnh (charts)
      let imageBuffer: Buffer | null = null;
      if (result.hasChart) {
        const imageResult = result.results.find((r: any) => r.png || r.jpeg);
        if (imageResult) {
          const base64Data = imageResult.png || imageResult.jpeg;
          imageBuffer = Buffer.from(base64Data, 'base64');
        }
      }

      // Build response
      const response: any = {
        success: !result.error,
        output: result.output,
        stdout: result.logs.stdout.join('\n'),
        stderr: result.logs.stderr.join('\n'),
        language,
        executionTime: `${timeout}ms max`,
      };

      if (installLogs.length > 0) {
        response.packageInstallation = installLogs;
      }

      if (result.error) {
        response.error = result.error;
      }

      // Nếu có chart/image, trả về như file
      if (imageBuffer) {
        return {
          success: true,
          data: {
            ...response,
            fileBuffer: imageBuffer,
            filename: 'output.png',
            mimeType: 'image/png',
            fileSize: imageBuffer.length,
            fileType: 'image',
          },
        };
      }

      return {
        success: true,
        data: response,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Lỗi thực thi code: ${msg}`,
      };
    } finally {
      // Cleanup sandbox
      if (sandbox) {
        try {
          await sandbox.kill();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  },
};
