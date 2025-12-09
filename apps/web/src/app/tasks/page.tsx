'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApiClient } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import {
  ListTodo,
  MoreHorizontal,
  XCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

const statusConfig = {
  completed: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: '#58CC02',
    bgColor: 'bg-[#58CC02]/10',
    borderColor: 'border-[#58CC02]/30',
  },
  failed: {
    label: 'Thất bại',
    icon: AlertCircle,
    color: '#FF4B4B',
    bgColor: 'bg-[#FF4B4B]/10',
    borderColor: 'border-[#FF4B4B]/30',
  },
  processing: {
    label: 'Đang xử lý',
    icon: Loader2,
    color: '#1CB0F6',
    bgColor: 'bg-[#1CB0F6]/10',
    borderColor: 'border-[#1CB0F6]/30',
  },
  cancelled: {
    label: 'Đã hủy',
    icon: Ban,
    color: '#777777',
    bgColor: 'bg-[#777777]/10',
    borderColor: 'border-[#777777]/30',
  },
  pending: {
    label: 'Chờ xử lý',
    icon: Clock,
    color: '#FF9600',
    bgColor: 'bg-[#FF9600]/10',
    borderColor: 'border-[#FF9600]/30',
  },
};

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

  const getStatusBadge = (taskStatus: string) => {
    const config = statusConfig[taskStatus as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bgColor} border ${config.borderColor}`}
        style={{ color: config.color }}
      >
        <Icon className={`h-3.5 w-3.5 ${taskStatus === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FF9600] text-white shadow-[0_4px_0_0_#E68600]">
            <ListTodo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tác vụ</h1>
            <p className="text-muted-foreground font-medium">Quản lý tác vụ nền</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-11 rounded-xl border-2 font-medium">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-2">
            <SelectItem value="all" className="rounded-lg font-medium">Tất cả</SelectItem>
            <SelectItem value="pending" className="rounded-lg font-medium">Chờ xử lý</SelectItem>
            <SelectItem value="processing" className="rounded-lg font-medium">Đang xử lý</SelectItem>
            <SelectItem value="completed" className="rounded-lg font-medium">Hoàn thành</SelectItem>
            <SelectItem value="failed" className="rounded-lg font-medium">Thất bại</SelectItem>
            <SelectItem value="cancelled" className="rounded-lg font-medium">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-border bg-card p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="h-6 w-20 bg-muted rounded-full" />
                <div className="h-8 w-8 bg-muted rounded-lg" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-24 bg-muted rounded-lg" />
                <div className="h-4 w-32 bg-muted rounded-lg" />
                <div className="h-4 w-28 bg-muted rounded-lg" />
              </div>
            </div>
          ))
        ) : data?.data?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF9600]/10 mb-4">
              <ListTodo className="h-8 w-8 text-[#FF9600]" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">Không có tác vụ nào</p>
            <p className="text-sm text-muted-foreground mt-1">Các tác vụ nền sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          data?.data?.map((task, index) => (
            <div
              key={task.id}
              className="group rounded-2xl border-2 border-border bg-card p-5 hover:border-[#FF9600]/50 transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                {getStatusBadge(task.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl border-2 p-2">
                    {task.status === 'pending' && (
                      <DropdownMenuItem
                        onClick={() => cancelMutation.mutate(task.id)}
                        className="rounded-lg cursor-pointer"
                      >
                        <XCircle className="mr-2 h-4 w-4 text-[#FF9600]" />
                        <span className="font-medium">Hủy</span>
                      </DropdownMenuItem>
                    )}
                    {task.status === 'failed' && (
                      <DropdownMenuItem
                        onClick={() => retryMutation.mutate(task.id)}
                        className="rounded-lg cursor-pointer"
                      >
                        <RefreshCw className="mr-2 h-4 w-4 text-[#1CB0F6]" />
                        <span className="font-medium">Thử lại</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(task.id)}
                      className="rounded-lg cursor-pointer text-[#FF4B4B] focus:text-[#FF4B4B]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span className="font-medium">Xóa</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</span>
                  <code className="text-sm font-mono font-medium">#{task.id}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loại</span>
                  <span className="text-sm font-semibold">{task.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lên lịch</span>
                  <span className="text-sm text-muted-foreground">{formatDate(task.scheduledAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thử lại</span>
                  <span className="text-sm font-medium">
                    <span className="text-[#FF9600]">{task.retryCount}</span>
                    <span className="text-muted-foreground">/{task.maxRetries}</span>
                  </span>
                </div>
                {(task.targetUserId || task.targetThreadId) && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mục tiêu</span>
                    <code className="block text-xs font-mono mt-1 truncate">
                      {task.targetUserId || task.targetThreadId}
                    </code>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground font-medium">
            Trang {data.pagination.page} / {data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-10 px-4 rounded-xl border-2 font-semibold hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
              className="h-10 px-4 rounded-xl border-2 font-semibold hover:bg-muted"
            >
              Sau
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
