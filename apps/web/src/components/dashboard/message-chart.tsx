'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

const chartConfig = {
  user: {
    label: 'Người dùng',
    color: '#58CC02',
  },
  model: {
    label: 'Bot',
    color: '#1CB0F6',
  },
} satisfies ChartConfig;

export function MessageChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats-messages'],
    queryFn: async () => {
      const res = await statsApi.getMessages(7);
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-[320px] bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Transform data for chart
  const chartData = data
    ? Object.entries(
        data.reduce(
          (acc, item) => {
            if (!acc[item.date]) {
              acc[item.date] = { date: item.date, user: 0, model: 0 };
            }
            acc[item.date][item.role as 'user' | 'model'] = item.count;
            return acc;
          },
          {} as Record<string, { date: string; user: number; model: number }>,
        ),
      )
        .map(([_, v]) => ({
          ...v,
          // Format date to shorter form
          dateLabel: new Date(v.date).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
          }),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Tin nhắn theo ngày</h3>
            <p className="text-sm text-muted-foreground">7 ngày gần nhất</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#58CC02]" />
            <span className="text-sm font-medium text-muted-foreground">Người dùng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1CB0F6]" />
            <span className="text-sm font-medium text-muted-foreground">Bot</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontWeight: 500 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
            />
            <Bar
              dataKey="user"
              fill="#58CC02"
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="model"
              fill="#1CB0F6"
              radius={[8, 8, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Empty State */}
      {(!chartData || chartData.length === 0) && (
        <div className="flex flex-col items-center justify-center h-[320px] text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Chưa có dữ liệu</p>
        </div>
      )}
    </div>
  );
}
