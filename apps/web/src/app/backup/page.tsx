'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApiClient, type BackupFile, type DatabaseInfo } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, Download, HardDrive, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN');
}

export default function BackupPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  // Fetch backups list
  const { data: backups, isLoading: loadingBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await backupApiClient.list();
      return res.data.data ?? [];
    },
  });

  // Fetch database info
  const { data: dbInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['dbInfo'],
    queryFn: async () => {
      const res = await backupApiClient.getInfo();
      return res.data.data;
    },
  });


  // Create backup mutation
  const createMutation = useMutation({
    mutationFn: () => backupApiClient.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã tạo backup thành công');
    },
    onError: () => toast.error('Lỗi khi tạo backup'),
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (name: string) => backupApiClient.restore(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['dbInfo'] });
      toast.success(`Đã restore từ ${name}`);
      setRestoring(null);
    },
    onError: () => {
      toast.error('Lỗi khi restore');
      setRestoring(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => backupApiClient.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã xóa backup');
    },
    onError: () => toast.error('Lỗi khi xóa backup'),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => backupApiClient.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã upload backup');
    },
    onError: () => toast.error('Lỗi khi upload'),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.db')) {
        toast.error('Chỉ chấp nhận file .db');
        return;
      }
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (name: string) => {
    window.open(backupApiClient.getDownloadUrl(name), '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-muted-foreground">Quản lý sao lưu và khôi phục database</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".db"
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo Backup
          </Button>
        </div>
      </div>

      {/* Database Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Thông tin Database
          </CardTitle>
          <CardDescription>Trạng thái database hiện tại</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInfo ? (
            <Skeleton className="h-24 w-full" />
          ) : dbInfo ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Đường dẫn</p>
                <p className="font-mono text-sm">{dbInfo.path}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Kích thước</p>
                <p className="font-semibold">{formatBytes(dbInfo.size)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cập nhật lần cuối</p>
                <p className="text-sm">{formatDate(dbInfo.modifiedAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Số bản ghi</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dbInfo.tables).map(([table, count]) => (
                    <span key={table} className="rounded bg-muted px-2 py-1 text-xs">
                      {table}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Không thể tải thông tin database</p>
          )}
        </CardContent>
      </Card>


      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Danh sách Backup
          </CardTitle>
          <CardDescription>Các bản sao lưu đã tạo</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBackups ? (
            <Skeleton className="h-48 w-full" />
          ) : backups && backups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên file</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.name}>
                    <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                    <TableCell>{formatBytes(backup.size)}</TableCell>
                    <TableCell>{formatDate(backup.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(backup.name)}
                          title="Tải xuống"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Khôi phục">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận khôi phục?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Database hiện tại sẽ được thay thế bằng backup <strong>{backup.name}</strong>.
                                Một bản backup tự động sẽ được tạo trước khi khôi phục.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setRestoring(backup.name);
                                  restoreMutation.mutate(backup.name);
                                }}
                                disabled={restoreMutation.isPending}
                              >
                                {restoring === backup.name ? 'Đang khôi phục...' : 'Khôi phục'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Xóa">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa backup <strong>{backup.name}</strong>? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(backup.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Chưa có backup nào</p>
              <Button className="mt-4" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo Backup đầu tiên
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
