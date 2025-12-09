'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoriesApiClient } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Search, Trash2, User, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MemoriesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['memories', page, search],
    queryFn: async () => {
      const res = await memoriesApiClient.list({
        page,
        limit: 20,
        search: search || undefined,
      });
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => memoriesApiClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Đã xóa memory');
    },
    onError: () => toast.error('Lỗi khi xóa memory'),
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#CE82FF] text-white shadow-[0_4px_0_0_#B86EE6]">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bộ nhớ</h1>
            <p className="text-muted-foreground font-medium">Bộ nhớ chung chia sẻ giữa tất cả AI</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm bộ nhớ..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-12 h-12 rounded-xl border-2 text-base font-medium focus:border-[#CE82FF] focus:ring-[#CE82FF]/20"
        />
      </div>

      {/* Memory Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-border bg-card p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="h-6 w-16 bg-muted rounded-lg" />
                <div className="h-8 w-8 bg-muted rounded-lg" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 w-full bg-muted rounded-lg" />
                <div className="h-4 w-3/4 bg-muted rounded-lg" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-muted rounded-lg" />
                <div className="h-4 w-24 bg-muted rounded-lg" />
              </div>
            </div>
          ))
        ) : data?.data?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#CE82FF]/10 mb-4">
              <Brain className="h-8 w-8 text-[#CE82FF]" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">Không có bộ nhớ nào</p>
            <p className="text-sm text-muted-foreground mt-1">Bot sẽ lưu trữ thông tin quan trọng ở đây</p>
          </div>
        ) : (
          data?.data?.map((memory, index) => (
            <div
              key={memory.id}
              className="group rounded-2xl border-2 border-border bg-card p-5 hover:border-[#CE82FF]/50 hover:shadow-lg transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#CE82FF]/10 text-xs font-bold text-[#CE82FF]">
                  #{memory.id}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(memory.id)}
                  className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FF4B4B]/10 hover:text-[#FF4B4B]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <p className="text-sm font-medium leading-relaxed mb-4 line-clamp-3" title={memory.content}>
                {truncate(memory.content, 120)}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {(memory.userName || memory.userId) && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted font-medium">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {memory.userName || memory.userId}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FF9600]/10 text-[#FF9600] font-semibold">
                  <Star className="h-3 w-3" />
                  {memory.importance}/10
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(memory.createdAt)}
                </span>
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
            <span className="text-muted-foreground/60 ml-2">
              ({data.pagination.total} memories)
            </span>
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
