'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi, type StatsOverview } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber, formatUptime } from '@/lib/utils';
import { Users, MessageSquare, Brain, Clock, Activity, ListTodo } from 'lucide-react';

export function StatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () => {
      const res = await statsApi.getOverview();
      return res.data.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Không thể tải thống kê</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: 'Người dùng',
      value: formatNumber(data.users),
      icon: Users,
      description: 'Tổng số người dùng',
    },
    {
      title: 'Tin nhắn',
      value: formatNumber(data.messages),
      icon: MessageSquare,
      description: `${formatNumber(data.messagesLast24h)} trong 24h qua`,
    },
    {
      title: 'Memories',
      value: formatNumber(data.memories),
      icon: Brain,
      description: 'Long-term memory',
    },
    {
      title: 'Uptime',
      value: formatUptime(data.uptime),
      icon: Clock,
      description: 'Thời gian hoạt động',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
