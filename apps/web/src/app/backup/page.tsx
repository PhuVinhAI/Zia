'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  Database,
  Download,
  HardDrive,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  FileArchive,
  Clock,
  Server,
  AlertTriangle,
} from 'lucide-react';
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

  const { data: backups, isLoading: loadingBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await backupApiClient.list();
      return res.data.data ?? [];
    },
  });

  const { data: dbInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['dbInfo'],
    queryFn: async () => {
      const res = await backupApiClient.getInfo();
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => backupApiClient.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã tạo backup thành công');
    },
    onError: () => toast.error('Lỗi khi tạo backup'),
  });

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

  const deleteMutation = useMutation({
    mutationFn: (name: string) => backupApiClient.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã xóa backup');
    },
    onError: () => toast.error('Lỗi khi xóa backup'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => backupApiClient.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success('Đã upload backup');
    },
    onError: () => toast.error('Lỗi khi upload'),
  });

  const resetMutation = useMutation({
    mutationFn: () => backupApiClient.resetDatabase(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['dbInfo'] });
      toast.success(`Database đã được reset. Backup: ${res.data.data?.preDeleteBackup}`);
    },
    onError: () => toast.error('Lỗi khi reset database'),
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FF4B4B] text-white shadow-[0_4px_0_0_#E63E3E]">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
            <p className="text-muted-foreground font-medium">Quản lý sao lưu và khôi phục database</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".db"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="h-11 px-4 rounded-xl border-2 font-semibold hover:bg-muted"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="h-11 px-5 rounded-xl font-semibold bg-[#58CC02] hover:bg-[#4CAF00] text-white shadow-[0_4px_0_0_#46A302] hover:shadow-[0_2px_0_0_#46A302] hover:translate-y-[2px] transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo Backup
          </Button>
        </div>
      </div>

      {/* Database Info Card */}
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_0_#1899D6]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Thông tin Database</h3>
              <p className="text-sm text-muted-foreground">Trạng thái database hiện tại</p>
            </div>
          </div>
          
          {/* Reset Database Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-4 rounded-xl border-2 border-[#FF4B4B]/50 text-[#FF4B4B] hover:bg-[#FF4B4B]/10 hover:border-[#FF4B4B] font-semibold"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reset Database
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-[#FF4B4B]">
                  <AlertTriangle className="h-5 w-5" />
                  Xác nhận xóa Database?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  <span className="block mb-2">
                    Hành động này sẽ <strong className="text-[#FF4B4B]">xóa toàn bộ dữ liệu</strong> trong database bao gồm:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-sm mb-3">
                    <li>Lịch sử tin nhắn (history)</li>
                    <li>Bộ nhớ AI (memories)</li>
                    <li>Các task đã lên lịch</li>
                    <li>Tin nhắn đã gửi</li>
                  </ul>
                  <span className="block text-[#58CC02] font-medium">
                    ✓ Một bản backup sẽ được tạo tự động trước khi xóa
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl border-2 font-semibold">
                  Hủy
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="rounded-xl font-semibold bg-[#FF4B4B] hover:bg-[#E63E3E] text-white"
                >
                  {resetMutation.isPending ? 'Đang xóa...' : 'Xóa Database'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {loadingInfo ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/50 animate-pulse">
                <div className="h-4 w-20 bg-muted rounded mb-2" />
                <div className="h-6 w-32 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : dbInfo ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Server className="h-4 w-4" />
                Đường dẫn
              </div>
              <p className="font-mono text-sm font-medium truncate" title={dbInfo.path}>
                {dbInfo.path}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#58CC02]/10 border border-[#58CC02]/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <HardDrive className="h-4 w-4" />
                Kích thước
              </div>
              <p className="text-lg font-bold text-[#58CC02]">{formatBytes(dbInfo.size)}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                Cập nhật lần cuối
              </div>
              <p className="text-sm font-medium">{formatDate(dbInfo.modifiedAt)}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Database className="h-4 w-4" />
                Số bản ghi
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dbInfo.tables).map(([table, count]) => (
                  <span
                    key={table}
                    className="px-2 py-1 rounded-lg bg-[#1CB0F6]/10 text-[#1CB0F6] text-xs font-semibold"
                  >
                    {table}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Không thể tải thông tin database</p>
        )}
      </div>

      {/* Backups List */}
      <div className="rounded-2xl border-2 border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF9600] text-white shadow-[0_3px_0_0_#E68600]">
            <FileArchive className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Danh sách Backup</h3>
            <p className="text-sm text-muted-foreground">Các bản sao lưu đã tạo</p>
          </div>
        </div>

        {loadingBackups ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl border-2 border-border animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-3" />
                <div className="flex gap-4 mb-4">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-9 bg-muted rounded-lg" />
                  <div className="h-9 w-9 bg-muted rounded-lg" />
                  <div className="h-9 w-9 bg-muted rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : backups && backups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {backups.map((backup, index) => (
              <div
                key={backup.name}
                className="group p-5 rounded-xl border-2 border-border hover:border-[#FF9600]/50 transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* File Name */}
                <div className="flex items-center gap-2 mb-3">
                  <FileArchive className="h-5 w-5 text-[#FF9600]" />
                  <span className="font-mono text-sm font-semibold truncate" title={backup.name}>
                    {backup.name}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="px-2 py-1 rounded-lg bg-muted font-medium">
                    {formatBytes(backup.size)}
                  </span>
                  <span>{formatDate(backup.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDownload(backup.name)}
                    className="h-9 w-9 rounded-lg border-2 hover:bg-[#1CB0F6]/10 hover:border-[#1CB0F6]/50 hover:text-[#1CB0F6]"
                    title="Tải xuống"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-2 hover:bg-[#58CC02]/10 hover:border-[#58CC02]/50 hover:text-[#58CC02]"
                        title="Khôi phục"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-2">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">
                          Xác nhận khôi phục?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          Database hiện tại sẽ được thay thế bằng backup{' '}
                          <strong className="text-foreground">{backup.name}</strong>. Một bản backup
                          tự động sẽ được tạo trước khi khôi phục.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-2 font-semibold">
                          Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setRestoring(backup.name);
                            restoreMutation.mutate(backup.name);
                          }}
                          disabled={restoreMutation.isPending}
                          className="rounded-xl font-semibold bg-[#58CC02] hover:bg-[#4CAF00]"
                        >
                          {restoring === backup.name ? 'Đang khôi phục...' : 'Khôi phục'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-2 hover:bg-[#FF4B4B]/10 hover:border-[#FF4B4B]/50 hover:text-[#FF4B4B]"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-2">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">
                          Xác nhận xóa?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          Bạn có chắc muốn xóa backup{' '}
                          <strong className="text-foreground">{backup.name}</strong>? Hành động này
                          không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-2 font-semibold">
                          Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(backup.name)}
                          className="rounded-xl font-semibold"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF9600]/10 mb-4">
              <HardDrive className="h-8 w-8 text-[#FF9600]" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground mb-2">Chưa có backup nào</p>
            <p className="text-sm text-muted-foreground mb-6">
              Tạo backup đầu tiên để bảo vệ dữ liệu của bạn
            </p>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="h-11 px-5 rounded-xl font-semibold bg-[#58CC02] hover:bg-[#4CAF00] text-white shadow-[0_4px_0_0_#46A302] hover:shadow-[0_2px_0_0_#46A302] hover:translate-y-[2px] transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo Backup đầu tiên
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
