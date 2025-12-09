'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';

const chartConfig = {
  user: {
    label: 'User',
    color: 'hsl(var(--chart-1))',
  },
  model: {
    label: 'Bot',
    color: 'hsl(var(--chart-2))',
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
      <Card>
        <CardHeader>
          <CardTitle>Tin nhắn theo ngày</CardTitle>
          <CardDescription>7 ngày gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
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
        .map(([_, v]) => v)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tin nhắn theo ngày</CardTitle>
        <CardDescription>7 ngày gần nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="user" fill="var(--color-user)" radius={4} />
            <Bar dataKey="model" fill="var(--color-model)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
