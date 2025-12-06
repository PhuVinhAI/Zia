/**
 * Integration Test: E2B Code Execution
 * Test các chức năng chạy code trong sandbox
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { executeCodeTool } from '../../../src/modules/system/tools/executeCode.js';
import { hasApiKey, TEST_CONFIG, mockToolContext } from '../setup.js';

const SKIP = !hasApiKey('e2b');

describe.skipIf(SKIP)('E2B Code Execution Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping E2B tests: E2B_API_KEY not configured');
  });

  test('executeCode - Python cơ bản', async () => {
    const result = await executeCodeTool.execute(
      {
        code: 'print("Hello from Python!")\nprint(2 + 2)',
        language: 'python',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('executeCode - Python với packages', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(f"Sum: {np.sum(arr)}")
print(f"Mean: {np.mean(arr)}")
`,
        language: 'python',
        packages: ['numpy'],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  }, 90000); // Longer timeout for package installation

  test('executeCode - JavaScript cơ bản', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
const arr = [1, 2, 3, 4, 5];
const sum = arr.reduce((a, b) => a + b, 0);
console.log('Sum:', sum);
console.log('Array:', arr.join(', '));
`,
        language: 'javascript',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('executeCode - JavaScript async/await', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
async function fetchData() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const data = await response.json();
  console.log('Title:', data.title);
  return data;
}
await fetchData();
`,
        language: 'javascript',
        timeout: 30000,
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('executeCode - TypeScript', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
interface User {
  name: string;
  age: number;
}

const user: User = { name: 'John', age: 30 };
console.log(\`User: \${user.name}, Age: \${user.age}\`);
`,
        language: 'typescript',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('executeCode - Python với matplotlib chart', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(8, 6))
plt.plot(x, y)
plt.title('Sine Wave')
plt.xlabel('X')
plt.ylabel('Y')
plt.grid(True)
plt.show()
`,
        language: 'python',
        packages: ['matplotlib', 'numpy'],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    // Chart output should have image buffer
    if (result.data.fileBuffer) {
      expect(result.data.fileBuffer).toBeInstanceOf(Buffer);
      expect(result.data.mimeType).toBe('image/png');
    }
  }, 90000);

  test('executeCode - xử lý lỗi syntax', async () => {
    const result = await executeCodeTool.execute(
      {
        code: 'print("unclosed string',
        language: 'python',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true); // Tool returns success but with error in data
    expect(result.data.error || result.data.stderr).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('executeCode - xử lý runtime error', async () => {
    const result = await executeCodeTool.execute(
      {
        code: `
x = 1 / 0
print(x)
`,
        language: 'python',
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.error).toContain('ZeroDivisionError');
  }, TEST_CONFIG.timeout);
});
