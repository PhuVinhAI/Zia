/**
 * Integration Test: createApp Tool
 * Test chức năng tạo ứng dụng web tĩnh (HTML single-file)
 */

import { describe, test, expect } from 'bun:test';
import { createAppTool } from '../../../src/modules/system/tools/createApp.js';
import { TEST_CONFIG, mockToolContext } from '../setup.js';

describe('createApp Tool Integration', () => {
  test('createApp - app đơn giản với tailwind', async () => {
    const result = await createAppTool.execute({
      name: 'Hello App',
      html: '<div class="p-4 text-center"><h1 class="text-2xl font-bold">Hello World</h1></div>',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.data.filename).toBe('Hello-App.html');
    expect(result.data.mimeType).toBe('text/html');

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('tailwindcss');
    expect(html).toContain('Hello World');
  }, TEST_CONFIG.timeout);

  test('createApp - với CSS và JS custom', async () => {
    const result = await createAppTool.execute({
      name: 'Custom App',
      html: '<div id="app"><button id="btn">Click me</button><p id="output"></p></div>',
      css: '#app { padding: 20px; } #btn { background: blue; color: white; }',
      js: 'document.getElementById("btn").onclick = () => { document.getElementById("output").textContent = "Clicked!"; }',
      title: 'My Custom App',
      description: 'A custom interactive app',
    }, mockToolContext);

    expect(result.success).toBe(true);

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('<title>My Custom App</title>');
    expect(html).toContain('#app { padding: 20px; }');
    expect(html).toContain('getElementById("btn")');
  }, TEST_CONFIG.timeout);

  test('createApp - với game library (kaboom)', async () => {
    const result = await createAppTool.execute({
      name: 'Simple Game',
      html: '<div id="game"></div>',
      js: 'kaboom(); add([rect(32, 32), pos(100, 100), color(255, 0, 0)]);',
      libraries: ['kaboom'],
    }, mockToolContext);

    expect(result.success).toBe(true);

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('kaboom');
    // kaboom uses unpkg CDN
    expect(html).toContain('unpkg.com');
  }, TEST_CONFIG.timeout);

  test('createApp - với multiple libraries', async () => {
    const result = await createAppTool.execute({
      name: 'Multi Lib App',
      html: '<div id="app"></div>',
      libraries: ['tailwind', 'alpine', 'chartjs', 'fontawesome'],
    }, mockToolContext);

    expect(result.success).toBe(true);

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('tailwindcss');
    expect(html).toContain('alpinejs');
    expect(html).toContain('chart.js');
    expect(html).toContain('font-awesome');
  }, TEST_CONFIG.timeout);

  test('createApp - với 3D library (three.js)', async () => {
    const result = await createAppTool.execute({
      name: '3D Scene',
      html: '<div id="container"></div>',
      js: 'const scene = new THREE.Scene(); console.log("Three.js loaded");',
      libraries: ['three'],
    }, mockToolContext);

    expect(result.success).toBe(true);

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('three');
  }, TEST_CONFIG.timeout);

  test('createApp - error handler included', async () => {
    const result = await createAppTool.execute({
      name: 'Error Test',
      html: '<div>Test</div>',
    }, mockToolContext);

    expect(result.success).toBe(true);

    const html = result.data.fileBuffer.toString('utf-8');
    expect(html).toContain('window.onerror');
    expect(html).toContain('app-error-box');
  }, TEST_CONFIG.timeout);

  test('createApp - filename sanitization', async () => {
    const result = await createAppTool.execute({
      name: 'Test App <with> special/chars',
      html: '<div>Test</div>',
    }, mockToolContext);

    expect(result.success).toBe(true);
    expect(result.data.filename).not.toContain('<');
    expect(result.data.filename).not.toContain('>');
    expect(result.data.filename).not.toContain('/');
  }, TEST_CONFIG.timeout);

  test('createApp - validation error (thiếu name)', async () => {
    const result = await createAppTool.execute({
      html: '<div>Test</div>',
    }, mockToolContext);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('createApp - validation error (thiếu html)', async () => {
    const result = await createAppTool.execute({
      name: 'Test',
    }, mockToolContext);

    expect(result.success).toBe(false);
  });
});
