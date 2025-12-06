/**
 * Integration Test: Chart Creation
 * Test các chức năng tạo biểu đồ với Chart.js
 */

import { describe, test, expect } from 'bun:test';
import { createChartTool } from '../../../src/modules/system/tools/createChart.js';
import { TEST_CONFIG, mockToolContext } from '../setup.js';

describe('Chart Creation Integration', () => {
  test('createChart - bar chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'bar',
        title: 'Monthly Sales',
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [
          {
            label: 'Sales 2024',
            data: [100, 150, 120, 180, 200],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.imageBuffer).toBeInstanceOf(Buffer);
    expect(result.data.mimeType).toBe('image/png');
    expect(result.data.chartType).toBe('bar');
    expect(result.data.fileSize).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('createChart - line chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'line',
        title: 'Temperature Trend',
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Temperature (°C)',
            data: [22, 24, 23, 25, 27, 26, 24],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.chartType).toBe('line');
    expect(result.data.imageBuffer.length).toBeGreaterThan(1000);
  }, TEST_CONFIG.timeout);

  test('createChart - pie chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'pie',
        title: 'Market Share',
        labels: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Others'],
        datasets: [
          {
            label: 'Browser Share',
            data: [65, 15, 10, 7, 3],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.chartType).toBe('pie');
  }, TEST_CONFIG.timeout);

  test('createChart - doughnut chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'doughnut',
        title: 'Budget Allocation',
        labels: ['Marketing', 'Development', 'Operations', 'HR'],
        datasets: [
          {
            label: 'Budget',
            data: [30, 40, 20, 10],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.chartType).toBe('doughnut');
  }, TEST_CONFIG.timeout);

  test('createChart - radar chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'radar',
        title: 'Skill Assessment',
        labels: ['JavaScript', 'Python', 'Go', 'Rust', 'TypeScript'],
        datasets: [
          {
            label: 'Developer A',
            data: [90, 70, 50, 40, 85],
          },
          {
            label: 'Developer B',
            data: [60, 90, 80, 70, 65],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.chartType).toBe('radar');
  }, TEST_CONFIG.timeout);

  test('createChart - multiple datasets', async () => {
    const result = await createChartTool.execute(
      {
        type: 'bar',
        title: 'Quarterly Comparison',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          { label: '2023', data: [100, 120, 140, 160] },
          { label: '2024', data: [110, 130, 150, 180] },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.imageBuffer).toBeInstanceOf(Buffer);
  }, TEST_CONFIG.timeout);

  test('createChart - custom dimensions', async () => {
    const result = await createChartTool.execute(
      {
        type: 'bar',
        title: 'Custom Size Chart',
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Values', data: [10, 20, 30] }],
        width: 1200,
        height: 800,
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    // Larger dimensions should result in larger file
    expect(result.data.fileSize).toBeGreaterThan(5000);
  }, TEST_CONFIG.timeout);

  test('createChart - validation error (empty data)', async () => {
    const result = await createChartTool.execute(
      {
        type: 'bar',
        title: 'Invalid Chart',
        labels: ['A', 'B'],
        datasets: [{ label: 'Empty', data: [] }],
      },
      mockToolContext,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('data');
  }, TEST_CONFIG.timeout);

  test('createChart - polarArea chart', async () => {
    const result = await createChartTool.execute(
      {
        type: 'polarArea',
        title: 'Activity Distribution',
        labels: ['Work', 'Sleep', 'Exercise', 'Leisure', 'Study'],
        datasets: [
          {
            label: 'Hours',
            data: [8, 7, 2, 4, 3],
          },
        ],
      },
      mockToolContext,
    );

    expect(result.success).toBe(true);
    expect(result.data.chartType).toBe('polarArea');
  }, TEST_CONFIG.timeout);
});
