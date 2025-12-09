'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { formatNumber, formatUptime } from '@/lib/utils';
import { MessageSquare, Brain, Clock, ListTodo, TrendingUp } from 'lucide-react';

export function StatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () => {
      const res = await statsApi.getOverview();
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-4 w-20 bg-muted rounded-lg" />
                <div className="h-8 w-16 bg-muted rounded-lg" />
                <div className="h-3 w-28 bg-muted rounded-lg" />
              </div>
              <div className="h-12 w-12 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border-2 border-[#FF4B4B]/30 bg-[#FF4B4B]/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF4B4B] text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="font-semibold text-[#FF4B4B]">Không thể tải thống kê</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Tin nhắn',
      value: formatNumber(data.messages),
      icon: MessageSquare,
      description: `+${formatNumber(data.messagesLast24h)} trong 24h`,
      color: '#58CC02',
      shadowColor: '#46A302',
      bgColor: 'bg-[#58CC02]/10',
      borderColor: 'border-[#58CC02]/30',
    },
    {
      title: 'Bộ nhớ',
      value: formatNumber(data.memories),
      icon: Brain,
      description: 'Bộ nhớ chung',
      color: '#CE82FF',
      shadowColor: '#B86EE6',
      bgColor: 'bg-[#CE82FF]/10',
      borderColor: 'border-[#CE82FF]/30',
    },
    {
      title: 'Tác vụ',
      value: formatNumber(data.tasks),
      icon: ListTodo,
      description: 'Tổng số tác vụ',
      color: '#FF9600',
      shadowColor: '#E68600',
      bgColor: 'bg-[#FF9600]/10',
      borderColor: 'border-[#FF9600]/30',
    },
    {
      title: 'Uptime',
      value: formatUptime(data.uptime),
      icon: Clock,
      description: 'Thời gian hoạt động',
      color: '#1CB0F6',
      shadowColor: '#1899D6',
      bgColor: 'bg-[#1CB0F6]/10',
      borderColor: 'border-[#1CB0F6]/30',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.title}
          className={`relative overflow-hidden rounded-2xl border-2 ${stat.borderColor} ${stat.bgColor} p-6 transition-all duration-200 hover:translate-y-[-2px] animate-slide-up`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                {stat.description}
              </p>
            </div>
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl text-white"
              style={{
                backgroundColor: stat.color,
                boxShadow: `0 4px 0 0 ${stat.shadowColor}`,
              }}
            >
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
