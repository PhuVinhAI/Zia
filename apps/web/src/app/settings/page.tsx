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
import { RefreshCw, Save } from 'lucide-react';
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

  if (isLoading || !localSettings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Cấu hình bot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => reloadMutation.mutate()} disabled={reloadMutation.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
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
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Settings</CardTitle>
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
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={localSettings.bot.prefix}
                    onChange={(e) => updateBotSetting('prefix', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Yêu cầu prefix</Label>
                  <p className="text-sm text-muted-foreground">Bắt buộc dùng prefix để gọi bot</p>
                </div>
                <Switch
                  checked={localSettings.bot.requirePrefix}
                  onCheckedChange={(v) => updateBotSetting('requirePrefix', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Streaming</Label>
                  <p className="text-sm text-muted-foreground">Gửi tin nhắn theo stream</p>
                </div>
                <Switch
                  checked={localSettings.bot.useStreaming}
                  onCheckedChange={(v) => updateBotSetting('useStreaming', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Hiện tool calls</Label>
                  <p className="text-sm text-muted-foreground">Hiển thị khi bot gọi tools</p>
                </div>
                <Switch
                  checked={localSettings.bot.showToolCalls}
                  onCheckedChange={(v) => updateBotSetting('showToolCalls', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Logging</Label>
                  <p className="text-sm text-muted-foreground">Ghi log hoạt động</p>
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
              <CardTitle>Modules</CardTitle>
              <CardDescription>Bật/tắt các module của bot</CardDescription>
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
                  <Label>Max Tool Depth</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.maxToolDepth}
                    onChange={(e) => updateBotSetting('maxToolDepth', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate Limit (ms)</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.rateLimitMs}
                    onChange={(e) => updateBotSetting('rateLimitMs', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Token History</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.maxTokenHistory}
                    onChange={(e) => updateBotSetting('maxTokenHistory', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow NSFW</Label>
                  <p className="text-sm text-muted-foreground">Cho phép nội dung NSFW</p>
                </div>
                <Switch
                  checked={localSettings.bot.allowNSFW}
                  onCheckedChange={(v) => updateBotSetting('allowNSFW', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Self Listen</Label>
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
