'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoriesApiClient, type Memory } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDate, truncate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Trash2 } from 'lucide-react';

const memoryTypes = ['conversation', 'fact', 'person', 'preference', 'task', 'note'] as const;

export default function MemoriesPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['memories', page, type, search],
    queryFn: async () => {
      const res = await memoriesApiClient.list({
        page,
        limit: 20,
        type: type === 'all' ? undefined : type,
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

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      conversation: 'bg-blue-500',
      fact: 'bg-green-500',
      person: 'bg-purple-500',
      preference: 'bg-yellow-500',
      task: 'bg-orange-500',
      note: 'bg-gray-500',
    };
    return (
      <Badge variant="secondary" className={`${colors[type] || ''} text-white`}>
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Memories</h1>
        <p className="text-muted-foreground">Long-term memory của bot</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {memoryTypes.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="max-w-[300px]">Content</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Importance</TableHead>
              <TableHead>Created</TableHead>
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
                  Không có memory nào
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((memory) => (
                <TableRow key={memory.id}>
                  <TableCell className="font-mono">{memory.id}</TableCell>
                  <TableCell>{getTypeBadge(memory.type)}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate" title={memory.content}>
                      {truncate(memory.content, 50)}
                    </p>
                  </TableCell>
                  <TableCell>{memory.userName || memory.userId || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{memory.importance}/10</Badge>
                  </TableCell>
                  <TableCell>{formatDate(memory.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(memory.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
            Trang {data.pagination.page} / {data.pagination.totalPages} ({data.pagination.total} memories)
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
