'use client';

import { useQuery } from '@tanstack/react-query';
import { historyApiClient, type Thread, type HistoryEntry } from '@/lib/api';
import { useState } from 'react';
import { formatDate, formatRelativeTime, truncate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, User, Bot, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['threads'],
    queryFn: async () => {
      const res = await historyApiClient.getThreads(50);
      return res.data.data;
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['thread-messages', selectedThread],
    queryFn: async () => {
      if (!selectedThread) return [];
      const res = await historyApiClient.getThread(selectedThread, 100);
      return res.data.data;
    },
    enabled: !!selectedThread,
  });

  if (selectedThread) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Thread: {truncate(selectedThread, 30)}</h1>
            <p className="text-sm text-muted-foreground">{messages?.length || 0} tin nhắn</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <ScrollArea className="h-[600px]">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-16 flex-1 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'model' && 'flex-row-reverse',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500',
                        )}
                      >
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4 text-white" />
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-lg p-3',
                          msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-muted',
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground">Lịch sử hội thoại</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {threadsLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : threads?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Chưa có lịch sử hội thoại
            </CardContent>
          </Card>
        ) : (
          threads?.map((thread) => (
            <Card
              key={thread.thread_id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedThread(thread.thread_id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {truncate(thread.thread_id, 20)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <Badge variant="secondary">{thread.message_count} tin nhắn</Badge>
                  <span>{formatRelativeTime(thread.last_message)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
