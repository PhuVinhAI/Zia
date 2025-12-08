/**
 * Chart Builder - Tạo biểu đồ trong PowerPoint
 */

import { CHART_TYPES, COLORS } from './constants.js';
import type { ChartConfig, ChartData, PresentationTheme } from './types.js';
import { lightenColor } from './utils.js';

// ═══════════════════════════════════════════════════
// MAIN CHART BUILDER
// ═══════════════════════════════════════════════════

export function buildChart(slide: any, config: ChartConfig, theme: PresentationTheme): void {
  const chartType = CHART_TYPES[config.type] || 'bar';
  const chartData = prepareChartData(config.data, theme);

  const chartOptions: any = {
    x: config.x || 0.5,
    y: config.y || 2.0,
    w: config.width || 9.0,
    h: config.height || 3.5,
    chartColors: chartData.colors,
    showLegend: config.showLegend !== false,
    legendPos: 'b',
    showTitle: !!config.title,
    title: config.title,
    titleFontSize: 14,
    titleColor: theme.colors.titleText,
    showValue: config.showValues || false,
    valAxisTitle: '',
    catAxisTitle: '',
    valGridLine: { color: 'E0E0E0', style: 'dash' },
  };

  // Type-specific options
  switch (config.type) {
    case 'pie':
    case 'doughnut':
      chartOptions.showPercent = true;
      chartOptions.showValue = false;
      break;
    case 'line':
      chartOptions.lineSmooth = true;
      chartOptions.lineDataSymbol = 'circle';
      chartOptions.lineDataSymbolSize = 8;
      break;
    case 'bar':
      chartOptions.barGapWidthPct = 50;
      break;
  }

  slide.addChart(chartType, chartData.data, chartOptions);
}

// ═══════════════════════════════════════════════════
// CHART DATA PREPARATION
// ═══════════════════════════════════════════════════

function prepareChartData(
  data: ChartData[],
  theme: PresentationTheme,
): { data: any[]; colors: string[] } {
  const defaultColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    COLORS.success,
    COLORS.warning,
    COLORS.info,
    COLORS.purple,
    COLORS.pink,
  ];

  const chartData = data.map((series, index) => ({
    name: series.name,
    labels: series.labels,
    values: series.values,
  }));

  const colors = data.map(
    (series, index) => series.color || defaultColors[index % defaultColors.length],
  );

  return { data: chartData, colors };
}

// ═══════════════════════════════════════════════════
// SPECIFIC CHART BUILDERS
// ═══════════════════════════════════════════════════

export function buildBarChart(
  slide: any,
  title: string,
  labels: string[],
  values: number[],
  theme: PresentationTheme,
  options?: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    horizontal?: boolean;
    stacked?: boolean;
  },
): void {
  const chartType = options?.horizontal ? 'bar' : 'bar';

  slide.addChart(
    chartType,
    [
      {
        name: title,
        labels,
        values,
      },
    ],
    {
      x: options?.x || 0.5,
      y: options?.y || 2.0,
      w: options?.width || 9.0,
      h: options?.height || 3.5,
      chartColors: [theme.colors.primary],
      showTitle: true,
      title,
      titleFontSize: 14,
      titleColor: theme.colors.titleText,
      barGapWidthPct: 50,
      showValue: true,
      dataLabelPosition: 'outEnd',
      dataLabelFontSize: 10,
      valGridLine: { color: 'E0E0E0', style: 'dash' },
      barDir: options?.horizontal ? 'bar' : 'col',
      barGrouping: options?.stacked ? 'stacked' : 'clustered',
    },
  );
}

export function buildLineChart(
  slide: any,
  title: string,
  series: Array<{ name: string; labels: string[]; values: number[]; color?: string }>,
  theme: PresentationTheme,
  options?: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    smooth?: boolean;
    showMarkers?: boolean;
  },
): void {
  const defaultColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    COLORS.success,
  ];

  slide.addChart('line', series, {
    x: options?.x || 0.5,
    y: options?.y || 2.0,
    w: options?.width || 9.0,
    h: options?.height || 3.5,
    chartColors: series.map((s, i) => s.color || defaultColors[i % defaultColors.length]),
    showTitle: true,
    title,
    titleFontSize: 14,
    titleColor: theme.colors.titleText,
    showLegend: series.length > 1,
    legendPos: 'b',
    lineSmooth: options?.smooth !== false,
    lineDataSymbol: options?.showMarkers !== false ? 'circle' : 'none',
    lineDataSymbolSize: 8,
    valGridLine: { color: 'E0E0E0', style: 'dash' },
  });
}

export function buildPieChart(
  slide: any,
  title: string,
  labels: string[],
  values: number[],
  theme: PresentationTheme,
  options?: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    doughnut?: boolean;
    showPercent?: boolean;
  },
): void {
  const chartType = options?.doughnut ? 'doughnut' : 'pie';
  const defaultColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    COLORS.success,
    COLORS.warning,
    COLORS.info,
    COLORS.purple,
    COLORS.pink,
  ];

  slide.addChart(
    chartType,
    [
      {
        name: title,
        labels,
        values,
      },
    ],
    {
      x: options?.x || 2.0,
      y: options?.y || 1.5,
      w: options?.width || 6.0,
      h: options?.height || 4.0,
      chartColors: defaultColors.slice(0, labels.length),
      showTitle: true,
      title,
      titleFontSize: 14,
      titleColor: theme.colors.titleText,
      showLegend: true,
      legendPos: 'r',
      showPercent: options?.showPercent !== false,
      showValue: false,
    },
  );
}

export function buildAreaChart(
  slide: any,
  title: string,
  series: Array<{ name: string; labels: string[]; values: number[]; color?: string }>,
  theme: PresentationTheme,
  options?: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    stacked?: boolean;
  },
): void {
  const defaultColors = [
    theme.colors.primary + '80',
    theme.colors.secondary + '80',
    theme.colors.accent + '80',
  ];

  slide.addChart('area', series, {
    x: options?.x || 0.5,
    y: options?.y || 2.0,
    w: options?.width || 9.0,
    h: options?.height || 3.5,
    chartColors: series.map((s, i) => s.color || defaultColors[i % defaultColors.length]),
    showTitle: true,
    title,
    titleFontSize: 14,
    titleColor: theme.colors.titleText,
    showLegend: series.length > 1,
    legendPos: 'b',
    valGridLine: { color: 'E0E0E0', style: 'dash' },
  });
}

// ═══════════════════════════════════════════════════
// MINI CHARTS (for dashboards)
// ═══════════════════════════════════════════════════

export function buildMiniChart(
  slide: any,
  type: 'bar' | 'line' | 'pie',
  values: number[],
  options: {
    x: number | string;
    y: number | string;
    width?: number | string;
    height?: number | string;
    color?: string;
    theme: PresentationTheme;
  },
): void {
  const { x, y, width = 2.0, height = 1.5, color, theme } = options;
  const labels = values.map((_, i) => String(i + 1));

  const chartOptions: any = {
    x,
    y,
    w: width,
    h: height,
    chartColors: [color || theme.colors.primary],
    showLegend: false,
    showTitle: false,
    showCatAxisTitle: false,
    showValAxisTitle: false,
    catAxisHidden: true,
    valAxisHidden: true,
    valGridLine: { style: 'none' },
  };

  if (type === 'line') {
    chartOptions.lineSmooth = true;
    chartOptions.lineDataSymbol = 'none';
  }

  slide.addChart(type, [{ name: '', labels, values }], chartOptions);
}

// ═══════════════════════════════════════════════════
// STAT CARD WITH CHART
// ═══════════════════════════════════════════════════

export function buildStatCard(
  slide: any,
  stat: {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    sparkline?: number[];
  },
  position: { x: number | string; y: number | string; width?: number | string },
  theme: PresentationTheme,
): void {
  const { x, y, width = 2.5 } = position;
  const cardHeight = 1.8;

  // Card background
  slide.addShape('roundRect', {
    x,
    y,
    w: width,
    h: cardHeight,
    fill: { color: 'FFFFFF' },
    line: { color: 'E0E0E0', pt: 1 },
    shadow: { type: 'outer', blur: 3, offset: 1, angle: 45, color: '000000', opacity: 0.1 },
  });

  // Title
  slide.addText(stat.title, {
    x: typeof x === 'number' ? x + 0.15 : x,
    y: typeof y === 'number' ? y + 0.1 : y,
    w: typeof width === 'number' ? width - 0.3 : width,
    h: 0.3,
    fontSize: 10,
    color: lightenColor(theme.colors.bodyText, 30),
    fontFace: theme.fonts.body,
  });

  // Value
  slide.addText(String(stat.value), {
    x: typeof x === 'number' ? x + 0.15 : x,
    y: typeof y === 'number' ? y + 0.4 : y,
    w: typeof width === 'number' ? width - 0.3 : width,
    h: 0.5,
    fontSize: 24,
    bold: true,
    color: theme.colors.titleText,
    fontFace: theme.fonts.title,
  });

  // Change indicator
  if (stat.change) {
    const changeColor =
      stat.changeType === 'up'
        ? COLORS.success
        : stat.changeType === 'down'
          ? COLORS.danger
          : theme.colors.bodyText;
    const arrow = stat.changeType === 'up' ? '↑' : stat.changeType === 'down' ? '↓' : '';

    slide.addText(`${arrow} ${stat.change}`, {
      x: typeof x === 'number' ? x + 0.15 : x,
      y: typeof y === 'number' ? y + 0.9 : y,
      w: 1.0,
      h: 0.25,
      fontSize: 10,
      color: changeColor,
      fontFace: theme.fonts.body,
    });
  }

  // Sparkline
  if (stat.sparkline && stat.sparkline.length > 0) {
    buildMiniChart(slide, 'line', stat.sparkline, {
      x: typeof x === 'number' ? x + (typeof width === 'number' ? width - 1.2 : 1.3) : x,
      y: typeof y === 'number' ? y + 1.0 : y,
      width: 1.0,
      height: 0.6,
      color: theme.colors.primary,
      theme,
    });
  }
}
