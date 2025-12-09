'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApiClient, type Task } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, XCircle, RefreshCw, Trash2 } from 'lucide-react';

export default function TasksPage() {
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', page, status],
    queryFn: async () => {
      const res = await tasksApiClient.list({
        page,
        limit: 20,
        status: status === 'all' ? undefined : status,
      });
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => tasksApiClient.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã hủy tác vụ');
    },
    onError: () => toast.error('Lỗi khi hủy tác vụ'),
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => tasksApiClient.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã đưa tác vụ vào hàng đợi thử lại');
    },
    onError: () => toast.error('Lỗi khi thử lại tác vụ'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApiClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã xóa tác vụ');
    },
    onError: () => toast.error('Lỗi khi xóa tác vụ'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Hoàn thành</Badge>;
      case 'failed':
        return <Badge variant="destructive">Thất bại</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-500 text-white">Đang xử lý</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">Chờ xử lý</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tác vụ</h1>
        <p className="text-muted-foreground">Quản lý tác vụ nền</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="processing">Đang xử lý</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Mục tiêu</TableHead>
              <TableHead>Lên lịch</TableHead>
              <TableHead>Thử lại</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Không có tác vụ nào
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono">{task.id}</TableCell>
                  <TableCell>{task.type}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {task.targetUserId || task.targetThreadId || '-'}
                  </TableCell>
                  <TableCell>{formatDate(task.scheduledAt)}</TableCell>
                  <TableCell>{task.retryCount}/{task.maxRetries}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {task.status === 'pending' && (
                          <DropdownMenuItem onClick={() => cancelMutation.mutate(task.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Hủy
                          </DropdownMenuItem>
                        )}
                        {task.status === 'failed' && (
                          <DropdownMenuItem onClick={() => retryMutation.mutate(task.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Thử lại
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(task.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {data.pagination.page} / {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
