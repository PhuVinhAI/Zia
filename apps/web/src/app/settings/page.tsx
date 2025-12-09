'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApiClient, type BotSettings } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, RefreshCw, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<BotSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApiClient.get();
      return res.data.data;
    },
  });

  useEffect(() => {
    if (data) setLocalSettings(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (settings: BotSettings) => settingsApiClient.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Đã lưu settings');
    },
    onError: () => toast.error('Lỗi khi lưu settings'),
  });

  const reloadMutation = useMutation({
    mutationFn: () => settingsApiClient.reload(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Đã reload settings');
    },
    onError: () => toast.error('Lỗi khi reload settings'),
  });

  const updateBotSetting = (key: keyof BotSettings['bot'], value: unknown) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      bot: { ...localSettings.bot, [key]: value },
    });
  };

  const updateModule = (key: string, value: boolean) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      modules: { ...localSettings.modules, [key]: value },
    });
  };

  const updateMaintenanceMode = (key: 'enabled' | 'message', value: boolean | string) => {
    if (!localSettings) return;
    const currentMaintenance = localSettings.bot.maintenanceMode ?? {
      enabled: true,
      message: '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!',
    };
    setLocalSettings({
      ...localSettings,
      bot: {
        ...localSettings.bot,
        maintenanceMode: {
          ...currentMaintenance,
          [key]: value,
        },
      },
    });
  };

  if (isLoading || !localSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
          <p className="text-muted-foreground">Cấu hình bot</p>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
          <p className="text-muted-foreground">Cấu hình bot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => reloadMutation.mutate()} disabled={reloadMutation.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tải lại
          </Button>
          <Button onClick={() => updateMutation.mutate(localSettings)} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Lưu
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="modules">Mô-đun</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {/* Maintenance Mode Card - Hiển thị nổi bật */}
          <Card className={localSettings.bot.maintenanceMode?.enabled ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${localSettings.bot.maintenanceMode?.enabled ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                Chế độ bảo trì
              </CardTitle>
              <CardDescription>Khi bật, bot sẽ chỉ phản hồi thông báo bảo trì</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Bật chế độ bảo trì</Label>
                  <p className="text-sm text-muted-foreground">Bot sẽ không xử lý tin nhắn khi bật</p>
                </div>
                <Switch
                  checked={localSettings.bot.maintenanceMode?.enabled ?? false}
                  onCheckedChange={(v) => updateMaintenanceMode('enabled', v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Thông báo bảo trì</Label>
                <Textarea
                  value={localSettings.bot.maintenanceMode?.message ?? '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!'}
                  onChange={(e) => updateMaintenanceMode('message', e.target.value)}
                  placeholder="Nhập thông báo hiển thị khi bot đang bảo trì..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cài đặt Bot</CardTitle>
              <CardDescription>Cấu hình cơ bản của bot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên bot</Label>
                  <Input
                    id="name"
                    value={localSettings.bot.name}
                    onChange={(e) => updateBotSetting('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix">Tiền tố</Label>
                  <Input
                    id="prefix"
                    value={localSettings.bot.prefix}
                    onChange={(e) => updateBotSetting('prefix', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Yêu cầu tiền tố</Label>
                  <p className="text-sm text-muted-foreground">Bắt buộc dùng tiền tố để gọi bot</p>
                </div>
                <Switch
                  checked={localSettings.bot.requirePrefix}
                  onCheckedChange={(v) => updateBotSetting('requirePrefix', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Phát trực tiếp</Label>
                  <p className="text-sm text-muted-foreground">Gửi tin nhắn theo luồng</p>
                </div>
                <Switch
                  checked={localSettings.bot.useStreaming}
                  onCheckedChange={(v) => updateBotSetting('useStreaming', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Hiện lệnh gọi công cụ</Label>
                  <p className="text-sm text-muted-foreground">Hiển thị khi bot gọi công cụ</p>
                </div>
                <Switch
                  checked={localSettings.bot.showToolCalls}
                  onCheckedChange={(v) => updateBotSetting('showToolCalls', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Ghi nhật ký</Label>
                  <p className="text-sm text-muted-foreground">Ghi nhật ký hoạt động</p>
                </div>
                <Switch
                  checked={localSettings.bot.logging}
                  onCheckedChange={(v) => updateBotSetting('logging', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mô-đun</CardTitle>
              <CardDescription>Bật/tắt các mô-đun của bot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(localSettings.modules).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key}</Label>
                  <Switch checked={value} onCheckedChange={(v) => updateModule(key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình nâng cao</CardTitle>
              <CardDescription>Các thiết lập nâng cao</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Độ sâu công cụ tối đa</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.maxToolDepth}
                    onChange={(e) => updateBotSetting('maxToolDepth', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giới hạn tốc độ (ms)</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.rateLimitMs}
                    onChange={(e) => updateBotSetting('rateLimitMs', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lịch sử token tối đa</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.maxTokenHistory}
                    onChange={(e) => updateBotSetting('maxTokenHistory', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Cho phép NSFW</Label>
                  <p className="text-sm text-muted-foreground">Cho phép nội dung người lớn</p>
                </div>
                <Switch
                  checked={localSettings.bot.allowNSFW}
                  onCheckedChange={(v) => updateBotSetting('allowNSFW', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Tự nghe</Label>
                  <p className="text-sm text-muted-foreground">Bot nghe tin nhắn của chính mình</p>
                </div>
                <Switch
                  checked={localSettings.bot.selfListen}
                  onCheckedChange={(v) => updateBotSetting('selfListen', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
