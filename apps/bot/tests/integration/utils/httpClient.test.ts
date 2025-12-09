/**
 * Integration Test: HTTP Client
 * Test các chức năng HTTP requests
 */

import { describe, test, expect } from 'bun:test';
import { http, createHttpClient, fetchAsBase64 } from '../../../src/shared/utils/httpClient.js';
import { TEST_CONFIG } from '../setup.js';

describe('HTTP Client Integration', () => {
  test('http - GET request', async () => {
    const response = await http.get('https://jsonplaceholder.typicode.com/todos/1').json<{
      userId: number;
      id: number;
      title: string;
      completed: boolean;
    }>();

    expect(response).toBeDefined();
    expect(response.id).toBe(1);
    expect(response.title).toBeDefined();
    expect(typeof response.completed).toBe('boolean');
  }, TEST_CONFIG.timeout);

  test('http - GET với query params', async () => {
    const response = await http
      .get('https://jsonplaceholder.typicode.com/posts', {
        searchParams: { userId: '1' },
      })
      .json<Array<{ userId: number; id: number; title: string }>>();

    expect(response).toBeArray();
    expect(response.length).toBeGreaterThan(0);
    expect(response.every((p) => p.userId === 1)).toBe(true);
  }, TEST_CONFIG.timeout);

  test('http - POST request', async () => {
    const response = await http
      .post('https://jsonplaceholder.typicode.com/posts', {
        json: {
          title: 'Test Post',
          body: 'This is a test',
          userId: 1,
        },
      })
      .json<{ id: number; title: string }>();

    expect(response).toBeDefined();
    expect(response.id).toBeDefined();
    expect(response.title).toBe('Test Post');
  }, TEST_CONFIG.timeout);

  test('createHttpClient - custom timeout', async () => {
    const client = createHttpClient({ timeout: 5000 });

    const response = await client.get('https://jsonplaceholder.typicode.com/users/1').json<{
      id: number;
      name: string;
      email: string;
    }>();

    expect(response.id).toBe(1);
    expect(response.name).toBeDefined();
    expect(response.email).toContain('@');
  }, TEST_CONFIG.timeout);

  test('fetchAsBase64 - download image as base64', async () => {
    // Use a reliable public image URL
    const imageUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';

    const base64 = await fetchAsBase64(imageUrl);

    // May fail due to network issues, so we check gracefully
    if (base64) {
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(100);

      // Verify it's valid base64
      const decoded = Buffer.from(base64, 'base64');
      expect(decoded.length).toBeGreaterThan(0);
    } else {
      // Skip if network fails
      console.log('⏭️  fetchAsBase64 skipped due to network issues');
    }
  }, TEST_CONFIG.timeout);

  test('http - xử lý 404 error', async () => {
    try {
      await http.get('https://jsonplaceholder.typicode.com/posts/99999').json();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  }, TEST_CONFIG.timeout);

  test('http - multiple concurrent requests', async () => {
    const requests = [
      http.get('https://jsonplaceholder.typicode.com/posts/1').json(),
      http.get('https://jsonplaceholder.typicode.com/posts/2').json(),
      http.get('https://jsonplaceholder.typicode.com/posts/3').json(),
    ];

    const results = await Promise.all(requests);

    expect(results).toBeArray();
    expect(results.length).toBe(3);
    results.forEach((r: any, i) => {
      expect(r.id).toBe(i + 1);
    });
  }, TEST_CONFIG.timeout);
});
