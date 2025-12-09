'use client';

import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime, formatNumber, truncate } from '@/lib/utils';
import { MessageSquare, Users } from 'lucide-react';

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
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-muted rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded-lg" />
                <div className="h-3 w-24 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_0_#1899D6]">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Threads hoạt động</h3>
          <p className="text-sm text-muted-foreground">Top 10 threads nhiều tin nhắn nhất</p>
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="h-[320px] pr-4">
        <div className="space-y-3">
          {data?.map((thread, index) => (
            <div
              key={thread.thread_id}
              className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              {/* Rank Badge */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm ${
                  index === 0
                    ? 'bg-[#FFD700] text-[#8B6914] shadow-[0_3px_0_0_#D4AF37]'
                    : index === 1
                      ? 'bg-[#C0C0C0] text-[#5A5A5A] shadow-[0_3px_0_0_#A0A0A0]'
                      : index === 2
                        ? 'bg-[#CD7F32] text-white shadow-[0_3px_0_0_#A0522D]'
                        : 'bg-muted text-muted-foreground border-2 border-border'
                }`}
              >
                {index + 1}
              </div>

              {/* Thread Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-[#1CB0F6] transition-colors">
                  {truncate(thread.thread_id, 24)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(thread.last_activity)}
                </p>
              </div>

              {/* Message Count */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1CB0F6]/10 border border-[#1CB0F6]/30">
                <MessageSquare className="h-3.5 w-3.5 text-[#1CB0F6]" />
                <span className="text-sm font-semibold text-[#1CB0F6]">
                  {formatNumber(thread.message_count)}
                </span>
              </div>
            </div>
          ))}

          {(!data || data.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Chưa có thread nào</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
