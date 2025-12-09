'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime, formatNumber, truncate } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

export function ActiveThreads() {
  const { data, isLoading } = useQuery({
    queryKey: ['active-threads'],
    queryFn: async () => {
      const res = await statsApi.getActiveThreads(10);
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Threads hoạt động</CardTitle>
          <CardDescription>Top 10 threads nhiều tin nhắn nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Threads hoạt động</CardTitle>
        <CardDescription>Top 10 threads nhiều tin nhắn nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {data?.map((thread) => (
              <div key={thread.thread_id} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{truncate(thread.thread_id, 20)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(thread.message_count)} tin nhắn •{' '}
                    {formatRelativeTime(thread.last_activity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
