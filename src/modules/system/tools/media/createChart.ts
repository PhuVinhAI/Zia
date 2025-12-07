/**
 * Tool: createChart - Tạo biểu đồ và xuất ra ảnh PNG
 * Sử dụng Chart.js + chartjs-node-canvas
 */

import type { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ITool, ToolResult } from '../../../../core/types.js';
import {
  CreateChartSchema,
  validateParamsWithExample,
} from '../../../../shared/schemas/tools.schema.js';

// Canvas renderer - width/height sẽ được set động
const createChartCanvas = (width: number, height: number) =>
  new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'white',
  });

export const createChartTool: ITool = {
  name: 'createChart',
  description: `Tạo biểu đồ xuất ảnh PNG. Loại: bar, line, pie, doughnut, radar, polarArea.

⚠️ BẮT BUỘC: JSON trên 1 dòng, "data" phải có mảng số!
📤 ẢNH TỰ ĐỘNG GỬI: Tool sẽ TỰ ĐỘNG gửi ảnh biểu đồ qua Zalo. KHÔNG cần dùng [image:] tag!
[tool:createChart]{"type":"bar","title":"Top 5","labels":["A","B","C","D","E"],"datasets":[{"label":"Value","data":[100,80,60,40,20]}]}[/tool]`,
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Loại biểu đồ: bar, line, pie, doughnut, radar, polarArea',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'Tiêu đề biểu đồ',
      required: true,
    },
    {
      name: 'labels',
      type: 'object',
      description: 'Mảng nhãn trục X. VD: ["Tháng 1", "Tháng 2", "Tháng 3"]',
      required: true,
    },
    {
      name: 'datasets',
      type: 'object',
      description:
        'Mảng datasets. Mỗi dataset: {label: string, data: number[], backgroundColor?: string}',
      required: true,
    },
    {
      name: 'width',
      type: 'number',
      description: 'Chiều rộng ảnh (px). Mặc định: 800',
      required: false,
    },
    {
      name: 'height',
      type: 'number',
      description: 'Chiều cao ảnh (px). Mặc định: 600',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    // Pre-check: datasets[].data phải là mảng số
    if (Array.isArray(params.datasets)) {
      for (const ds of params.datasets) {
        if (!ds.data || !Array.isArray(ds.data) || ds.data.length === 0) {
          return {
            success: false,
            error: `LỖI: "data" phải là mảng số! VD: "data":[100,200,300]. Bạn đã để trống.`,
          };
        }
      }
    }

    const validation = validateParamsWithExample(CreateChartSchema, params, 'createChart');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const width = data.width || 800;
      const height = data.height || 600;
      const chartCanvas = createChartCanvas(width, height);

      // Màu mặc định cho datasets
      const defaultColors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(83, 102, 255, 0.8)',
      ];

      const borderColors = defaultColors.map((c) => c.replace('0.8', '1'));

      // Process datasets - thêm màu nếu chưa có
      const processedDatasets = data.datasets.map((ds: any, index: number) => {
        const isPieType = ['pie', 'doughnut', 'polarArea'].includes(data.type);

        return {
          label: ds.label || `Dataset ${index + 1}`,
          data: ds.data,
          backgroundColor:
            ds.backgroundColor ||
            (isPieType
              ? defaultColors.slice(0, ds.data.length)
              : defaultColors[index % defaultColors.length]),
          borderColor:
            ds.borderColor ||
            (isPieType
              ? borderColors.slice(0, ds.data.length)
              : borderColors[index % borderColors.length]),
          borderWidth: ds.borderWidth || 2,
          fill: ds.fill ?? (data.type === 'line' ? false : undefined),
          tension: ds.tension ?? (data.type === 'line' ? 0.3 : undefined),
        };
      });

      const config: ChartConfiguration = {
        type: data.type as any,
        data: {
          labels: data.labels,
          datasets: processedDatasets,
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: data.title,
              font: { size: 18, weight: 'bold' },
              padding: 20,
            },
            legend: {
              display: true,
              position: 'bottom',
            },
          },
          scales:
            data.type !== 'pie' &&
            data.type !== 'doughnut' &&
            data.type !== 'polarArea' &&
            data.type !== 'radar'
              ? {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                  },
                  x: {
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                  },
                }
              : undefined,
        },
      };

      const imageBuffer = await chartCanvas.renderToBuffer(config);

      return {
        success: true,
        data: {
          imageBuffer,
          filename: `chart_${Date.now()}.png`,
          mimeType: 'image/png',
          fileSize: imageBuffer.length,
          chartType: data.type,
          title: data.title,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo biểu đồ: ${error.message}` };
    }
  },
};
