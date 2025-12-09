'use client';

import { useQuery } from '@tanstack/react-query';
import { historyApiClient } from '@/lib/api';
import { formatRelativeTime, truncate } from '@/lib/utils';
import { MessageSquare, Clock, Hash } from 'lucide-react';

export default function HistoryPage() {
  const { data: threads, isLoading } = useQuery({
    queryKey: ['threads'],
    queryFn: async () => {
      const res = await historyApiClient.getThreads(50);
      return res.data.data;
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6]">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lịch sử</h1>
          <p className="text-muted-foreground font-medium">Lịch sử hội thoại với bot</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/50 border-b-2 border-border">
          <div className="col-span-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Hash className="h-4 w-4" />
            Thread ID
          </div>
          <div className="col-span-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <MessageSquare className="h-4 w-4" />
            Tin nhắn
          </div>
          <div className="col-span-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Clock className="h-4 w-4" />
            Hoạt động
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y-2 divide-border">
          {isLoading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 animate-pulse">
                <div className="col-span-6">
                  <div className="h-5 w-48 bg-muted rounded-lg" />
                </div>
                <div className="col-span-3">
                  <div className="h-7 w-16 bg-muted rounded-full" />
                </div>
                <div className="col-span-3">
                  <div className="h-5 w-24 bg-muted rounded-lg" />
                </div>
              </div>
            ))
          ) : threads?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">Chưa có lịch sử hội thoại</p>
              <p className="text-sm text-muted-foreground mt-1">Các cuộc hội thoại sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            threads?.map((thread, index) => (
              <div
                key={thread.thread_id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="col-span-6 flex items-center">
                  <code className="text-sm font-mono font-medium group-hover:text-[#1CB0F6] transition-colors">
                    {truncate(thread.thread_id, 40)}
                  </code>
                </div>
                <div className="col-span-3 flex items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1CB0F6]/10 border border-[#1CB0F6]/30 text-sm font-semibold text-[#1CB0F6]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {thread.message_count}
                  </span>
                </div>
                <div className="col-span-3 flex items-center">
                  <span className="text-sm text-muted-foreground font-medium">
                    {formatRelativeTime(thread.last_message)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
