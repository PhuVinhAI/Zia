'use client';

import { useQuery } from '@tanstack/react-query';
import { logsApiClient } from '@/lib/api';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Folder,
  FileText,
  ArrowLeft,
  FileCode,
  HardDrive,
  Copy,
  Download,
  RefreshCw,
  ChevronDown,
  Check,
} from 'lucide-react';

export default function LogsPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [linesToLoad, setLinesToLoad] = useState(200);
  const [copied, setCopied] = useState(false);

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['log-folders'],
    queryFn: async () => {
      const res = await logsApiClient.listFolders();
      return res.data.data;
    },
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['log-files', selectedFolder],
    queryFn: async () => {
      if (!selectedFolder) return [];
      const res = await logsApiClient.listFiles(selectedFolder);
      return res.data.data;
    },
    enabled: !!selectedFolder && !selectedFile,
  });

  const {
    data: fileContent,
    isLoading: contentLoading,
    refetch: refetchContent,
    isFetching,
  } = useQuery({
    queryKey: ['log-content', selectedFolder, selectedFile, linesToLoad],
    queryFn: async () => {
      if (!selectedFolder || !selectedFile) return null;
      const res = await logsApiClient.getFile(selectedFolder, selectedFile, linesToLoad);
      return res.data.data;
    },
    enabled: !!selectedFolder && !!selectedFile,
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCopy = async () => {
    if (!fileContent?.lines) return;
    try {
      await navigator.clipboard.writeText(fileContent.lines.join('\n'));
      setCopied(true);
      toast.success('Đã copy nội dung');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const handleDownload = () => {
    if (!fileContent?.lines || !selectedFile) return;
    const content = fileContent.lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file');
  };

  const handleLoadMore = () => {
    setLinesToLoad((prev) => prev + 500);
  };

  const handleLoadAll = () => {
    if (fileContent?.totalLines) {
      setLinesToLoad(fileContent.totalLines);
    }
  };

  // View file content
  if (selectedFile && selectedFolder) {
    const logContent = fileContent?.lines.join('\n') || '';

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedFile(null);
                setLinesToLoad(200);
              }}
              className="h-10 w-10 rounded-xl hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_0_#1899D6]">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{selectedFile}</h1>
                <p className="text-sm text-muted-foreground font-medium">{selectedFolder}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchContent()}
              disabled={isFetching}
              className="h-9 px-3 rounded-lg border-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!fileContent?.lines}
              className="h-9 px-3 rounded-lg border-2"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-[#58CC02]" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? 'Đã copy' : 'Copy'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!fileContent?.lines}
              className="h-9 px-3 rounded-lg border-2"
            >
              <Download className="h-4 w-4 mr-2" />
              Tải xuống
            </Button>
          </div>
        </div>

        {/* File Content */}
        <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
          {/* Stats bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b-2 border-border">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{fileContent?.lines.length || 0}</span> /{' '}
                {fileContent?.totalLines || 0} dòng
              </span>
              {fileContent?.hasMore && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF9600]/10 text-[#FF9600] text-xs font-semibold">
                  Còn {(fileContent.totalLines || 0) - (fileContent.lines.length || 0)} dòng
                </span>
              )}
            </div>
            {fileContent?.hasMore && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="h-7 px-2 text-xs rounded-lg"
                >
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Thêm 500 dòng
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadAll}
                  className="h-7 px-2 text-xs rounded-lg text-[#1CB0F6]"
                >
                  Tải tất cả
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
            <div className="p-4">
              {contentLoading ? (
                <div className="space-y-2">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 bg-muted rounded animate-pulse"
                      style={{ width: `${Math.random() * 40 + 60}%` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="relative">
                  {logContent.split('\n').map((line, index) => (
                    <div
                      key={index}
                      className="flex hover:bg-muted/50 group text-xs font-mono leading-6"
                    >
                      <span className="select-none w-10 pr-3 text-right text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 sticky left-0 bg-card">
                        {index + 1}
                      </span>
                      <code className="whitespace-pre-wrap break-all text-foreground/90 min-w-0 flex-1" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                        {line}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // View files in folder
  if (selectedFolder) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFolder(null)}
            className="h-10 w-10 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF9600] text-white shadow-[0_3px_0_0_#E68600]">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{selectedFolder}</h1>
              <p className="text-sm text-muted-foreground font-medium">{files?.length || 0} tệp</p>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filesLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-muted rounded-xl" />
                  <div className="h-5 w-32 bg-muted rounded-lg" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-muted rounded-lg" />
                  <div className="h-4 w-24 bg-muted rounded-lg" />
                </div>
              </div>
            ))
          ) : files?.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">Thư mục trống</p>
            </div>
          ) : (
            files?.map((file, index) => (
              <div
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className="group rounded-2xl border-2 border-border bg-card p-5 cursor-pointer hover:border-[#1CB0F6]/50 hover:shadow-lg transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6]/10 text-[#1CB0F6] group-hover:bg-[#1CB0F6] group-hover:text-white transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="font-semibold truncate group-hover:text-[#1CB0F6] transition-colors">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="px-2 py-1 rounded-lg bg-muted font-medium text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <span className="text-muted-foreground">{formatDate(file.modified)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // View folders
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#3C3C3C] dark:bg-[#9CA3AF] text-white shadow-[0_4px_0_0_#2A2A2A] dark:shadow-[0_4px_0_0_#6B7280]">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nhật ký</h1>
          <p className="text-muted-foreground font-medium">Nhật ký hệ thống</p>
        </div>
      </div>

      {/* Folders Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {foldersLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-border bg-card p-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-xl" />
                <div className="h-5 w-32 bg-muted rounded-lg" />
              </div>
            </div>
          ))
        ) : folders?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">Chưa có logs</p>
            <p className="text-sm text-muted-foreground mt-1">Nhật ký hệ thống sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          folders?.map((folder, index) => (
            <div
              key={folder.name}
              onClick={() => setSelectedFolder(folder.name)}
              className="group rounded-2xl border-2 border-border bg-card p-6 cursor-pointer hover:border-[#FF9600]/50 hover:shadow-lg transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#FF9600]/10 text-[#FF9600] group-hover:bg-[#FF9600] group-hover:text-white group-hover:shadow-[0_3px_0_0_#E68600] transition-all">
                  <Folder className="h-6 w-6" />
                </div>
                <span className="text-lg font-semibold group-hover:text-[#FF9600] transition-colors">
                  {folder.name}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
