'use client';

import { useQuery } from '@tanstack/react-query';
import { historyApiClient } from '@/lib/api';
import { formatRelativeTime, truncate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function HistoryPage() {
  const { data: threads, isLoading } = useQuery({
    queryKey: ['threads'],
    queryFn: async () => {
      const res = await historyApiClient.getThreads(50);
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lịch sử</h1>
        <p className="text-muted-foreground">Lịch sử hội thoại</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thread ID</TableHead>
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Hoạt động cuối</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : threads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Chưa có lịch sử hội thoại
                </TableCell>
              </TableRow>
            ) : (
              threads?.map((thread) => (
                <TableRow key={thread.thread_id}>
                  <TableCell className="font-mono text-sm">
                    {truncate(thread.thread_id, 30)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{thread.message_count}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(thread.last_message)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
