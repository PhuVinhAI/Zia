'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApiClient, type BotSettings } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Settings,
  AlertTriangle,
  RefreshCw,
  Save,
  Bot,
  Puzzle,
  Wrench,
  Zap,
  MessageSquare,
  Brain,
  Moon,
  Clock,
  Database,
  Users,
} from 'lucide-react';
import { useState } from 'react';

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

  // Sync fetched data into local state during render to avoid setState-in-effect.
  if (data && localSettings === null) {
    setLocalSettings(data);
  }

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

  // Update helpers
  const updateBotSetting = <K extends keyof BotSettings['bot']>(key: K, value: BotSettings['bot'][K]) => {
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
      enabled: false,
      message: '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!',
    };
    setLocalSettings({
      ...localSettings,
      bot: {
        ...localSettings.bot,
        maintenanceMode: { ...currentMaintenance, [key]: value },
      },
    });
  };

  const updateSleepMode = <K extends keyof BotSettings['bot']['sleepMode']>(
    key: K,
    value: BotSettings['bot']['sleepMode'][K]
  ) => {
    if (!localSettings) return;
    const currentSleep = localSettings.bot.sleepMode ?? {
      enabled: false,
      sleepHour: 23,
      wakeHour: 6,
      checkIntervalMs: 1800000,
    };
    setLocalSettings({
      ...localSettings,
      bot: {
        ...localSettings.bot,
        sleepMode: { ...currentSleep, [key]: value },
      },
    });
  };

  const updateGemini = <K extends keyof BotSettings['gemini']>(key: K, value: BotSettings['gemini'][K]) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      gemini: { ...localSettings.gemini, [key]: value },
    });
  };

  const updateBuffer = <K extends keyof BotSettings['buffer']>(key: K, value: BotSettings['buffer'][K]) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      buffer: { ...localSettings.buffer, [key]: value },
    });
  };

  const updateHistory = <K extends keyof BotSettings['history']>(key: K, value: BotSettings['history'][K]) => {
    if (!localSettings) return;
    setLocalSettings({
      ...localSettings,
      history: { ...localSettings.history, [key]: value },
    });
  };

  const updateAllowedUserIds = (value: string) => {
    if (!localSettings) return;
    const ids = value.split('\n').map((id) => id.trim()).filter(Boolean);
    setLocalSettings({
      ...localSettings,
      allowedUserIds: ids,
    });
  };

  if (isLoading || !localSettings) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-[500px] bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }


  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#777777] text-white shadow-[0_4px_0_0_#5A5A5A]">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cài đặt</h1>
            <p className="text-muted-foreground font-medium">Cấu hình bot</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending}
            className="h-11 px-4 rounded-xl border-2 font-semibold hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
          <Button
            onClick={() => updateMutation.mutate(localSettings)}
            disabled={updateMutation.isPending}
            className="h-11 px-5 rounded-xl font-semibold bg-[#58CC02] hover:bg-[#4CAF00] text-white shadow-[0_4px_0_0_#46A302] hover:shadow-[0_2px_0_0_#46A302] hover:translate-y-[2px] transition-all"
          >
            <Save className="h-4 w-4 mr-2" />
            Lưu
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="h-12 p-1 rounded-xl bg-muted border-2 border-border flex-wrap">
          <TabsTrigger value="general" className="h-10 px-4 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Bot className="h-4 w-4 mr-2" />
            Chung
          </TabsTrigger>
          <TabsTrigger value="ai" className="h-10 px-4 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Brain className="h-4 w-4 mr-2" />
            AI
          </TabsTrigger>
          <TabsTrigger value="modules" className="h-10 px-4 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Puzzle className="h-4 w-4 mr-2" />
            Mô-đun
          </TabsTrigger>
          <TabsTrigger value="performance" className="h-10 px-4 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Zap className="h-4 w-4 mr-2" />
            Hiệu suất
          </TabsTrigger>
          <TabsTrigger value="advanced" className="h-10 px-4 rounded-lg font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Wrench className="h-4 w-4 mr-2" />
            Nâng cao
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Maintenance Mode Card */}
          <div className={`rounded-2xl border-2 p-6 transition-colors ${
            localSettings.bot.maintenanceMode?.enabled
              ? 'border-[#FF9600]/50 bg-[#FF9600]/5'
              : 'border-border bg-card'
          }`}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                localSettings.bot.maintenanceMode?.enabled
                  ? 'bg-[#FF9600] text-white shadow-[0_4px_0_0_#E68600]'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">Chế độ bảo trì</h3>
                <p className="text-sm text-muted-foreground">Khi bật, bot sẽ chỉ phản hồi thông báo bảo trì</p>
              </div>
              <Switch
                checked={localSettings.bot.maintenanceMode?.enabled ?? false}
                onCheckedChange={(v) => updateMaintenanceMode('enabled', v)}
                className="data-[state=checked]:bg-[#FF9600]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Thông báo bảo trì</Label>
              <Textarea
                value={localSettings.bot.maintenanceMode?.message ?? '🔧 Bot đang trong chế độ bảo trì. Vui lòng thử lại sau!'}
                onChange={(e) => updateMaintenanceMode('message', e.target.value)}
                placeholder="Nhập thông báo hiển thị khi bot đang bảo trì..."
                rows={2}
                className="rounded-xl border-2 resize-none"
              />
            </div>
          </div>

          {/* Sleep Mode Card */}
          <div className={`rounded-2xl border-2 p-6 transition-colors ${
            localSettings.bot.sleepMode?.enabled
              ? 'border-[#CE82FF]/50 bg-[#CE82FF]/5'
              : 'border-border bg-card'
          }`}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                localSettings.bot.sleepMode?.enabled
                  ? 'bg-[#CE82FF] text-white shadow-[0_4px_0_0_#B86EE6]'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Moon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">Chế độ ngủ</h3>
                <p className="text-sm text-muted-foreground">Tự động offline theo giờ đã cài đặt</p>
              </div>
              <Switch
                checked={localSettings.bot.sleepMode?.enabled ?? false}
                onCheckedChange={(v) => updateSleepMode('enabled', v)}
                className="data-[state=checked]:bg-[#CE82FF]"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Giờ ngủ (0-23)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={localSettings.bot.sleepMode?.sleepHour ?? 23}
                  onChange={(e) => updateSleepMode('sleepHour', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Giờ thức (0-23)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={localSettings.bot.sleepMode?.wakeHour ?? 6}
                  onChange={(e) => updateSleepMode('wakeHour', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
              </div>
            </div>
          </div>

          {/* Bot Settings Card */}
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cài đặt Bot</h3>
                <p className="text-sm text-muted-foreground">Cấu hình cơ bản của bot</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tên bot</Label>
                  <Input
                    value={localSettings.bot.name}
                    onChange={(e) => updateBotSetting('name', e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tiền tố</Label>
                  <Input
                    value={localSettings.bot.prefix}
                    onChange={(e) => updateBotSetting('prefix', e.target.value)}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <SettingToggle
                  label="Yêu cầu tiền tố"
                  description="Bắt buộc dùng tiền tố để gọi bot"
                  checked={localSettings.bot.requirePrefix}
                  onCheckedChange={(v) => updateBotSetting('requirePrefix', v)}
                  icon={MessageSquare}
                  color="#1CB0F6"
                />
                <SettingToggle
                  label="Phát trực tiếp"
                  description="Gửi tin nhắn theo luồng (streaming)"
                  checked={localSettings.bot.useStreaming}
                  onCheckedChange={(v) => updateBotSetting('useStreaming', v)}
                  icon={Zap}
                  color="#FF9600"
                />
                <SettingToggle
                  label="Hiện lệnh gọi công cụ"
                  description="Hiển thị khi bot gọi công cụ"
                  checked={localSettings.bot.showToolCalls}
                  onCheckedChange={(v) => updateBotSetting('showToolCalls', v)}
                  icon={Wrench}
                  color="#CE82FF"
                />
                <SettingToggle
                  label="Ghi nhật ký"
                  description="Ghi nhật ký hoạt động"
                  checked={localSettings.bot.logging}
                  onCheckedChange={(v) => updateBotSetting('logging', v)}
                  icon={Settings}
                  color="#777777"
                />
                <SettingToggle
                  label="Sử dụng nhân vật"
                  description="Sử dụng character/persona cho bot"
                  checked={localSettings.bot.useCharacter}
                  onCheckedChange={(v) => updateBotSetting('useCharacter', v)}
                  icon={Users}
                  color="#1CB0F6"
                />
              </div>
            </div>
          </div>
        </TabsContent>


        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
          {/* Gemini Settings */}
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_0_#1899D6]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Gemini AI</h3>
                <p className="text-sm text-muted-foreground">Cấu hình model Gemini</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm font-semibold">Temperature: {localSettings.gemini?.temperature ?? 1}</Label>
                  </div>
                  <Slider
                    value={[localSettings.gemini?.temperature ?? 1]}
                    onValueChange={([v]) => updateGemini('temperature', v)}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Độ sáng tạo của AI (0 = chính xác, 2 = sáng tạo)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm font-semibold">Top P: {localSettings.gemini?.topP ?? 0.95}</Label>
                  </div>
                  <Slider
                    value={[localSettings.gemini?.topP ?? 0.95]}
                    onValueChange={([v]) => updateGemini('topP', v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Nucleus sampling (0.1 = tập trung, 1 = đa dạng)</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Max Output Tokens</Label>
                  <Input
                    type="number"
                    value={localSettings.gemini?.maxOutputTokens ?? 65536}
                    onChange={(e) => updateGemini('maxOutputTokens', Number(e.target.value))}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Thinking Budget</Label>
                  <Input
                    type="number"
                    value={localSettings.gemini?.thinkingBudget ?? 8192}
                    onChange={(e) => updateGemini('thinkingBudget', Number(e.target.value))}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Models (mỗi dòng 1 model)</Label>
                <Textarea
                  value={(localSettings.gemini?.models ?? []).join('\n')}
                  onChange={(e) => updateGemini('models', e.target.value.split('\n').filter(Boolean))}
                  placeholder="models/gemini-3-flash-preview"
                  rows={3}
                  className="rounded-xl border-2 resize-none font-mono text-sm"
                />
              </div>
            </div>
          </div>

        </TabsContent>


        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#CE82FF] text-white shadow-[0_3px_0_0_#B86EE6]">
                <Puzzle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Mô-đun</h3>
                <p className="text-sm text-muted-foreground">Bật/tắt các mô-đun của bot</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(localSettings.modules).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border-2 border-transparent hover:border-[#CE82FF]/30 transition-colors"
                >
                  <div>
                    <span className="font-semibold capitalize">{key}</span>
                    <p className="text-xs text-muted-foreground">{getModuleDescription(key)}</p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(v) => updateModule(key, v)}
                    className="data-[state=checked]:bg-[#CE82FF]"
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Buffer Settings */}
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white shadow-[0_3px_0_0_#1899D6]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Buffer & Timing</h3>
                <p className="text-sm text-muted-foreground">Cấu hình độ trễ và buffer</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Buffer Delay (ms)</Label>
                <Input
                  type="number"
                  value={localSettings.buffer?.delayMs ?? 2500}
                  onChange={(e) => updateBuffer('delayMs', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
                <p className="text-xs text-muted-foreground">Độ trễ trước khi xử lý tin nhắn</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Typing Refresh (ms)</Label>
                <Input
                  type="number"
                  value={localSettings.buffer?.typingRefreshMs ?? 3000}
                  onChange={(e) => updateBuffer('typingRefreshMs', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
                <p className="text-xs text-muted-foreground">Tần suất refresh trạng thái đang gõ</p>
              </div>
            </div>
          </div>

          {/* History Settings */}
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302]">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">History & Context</h3>
                <p className="text-sm text-muted-foreground">Cấu hình lịch sử và context</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Max Context Tokens</Label>
                <Input
                  type="number"
                  value={localSettings.history?.maxContextTokens ?? 300000}
                  onChange={(e) => updateHistory('maxContextTokens', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Max Token History</Label>
                <Input
                  type="number"
                  value={localSettings.bot.maxTokenHistory}
                  onChange={(e) => updateBotSetting('maxTokenHistory', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Max Input Tokens</Label>
                <Input
                  type="number"
                  value={localSettings.bot.maxInputTokens}
                  onChange={(e) => updateBotSetting('maxInputTokens', Number(e.target.value))}
                  className="h-11 rounded-xl border-2"
                />
              </div>
            </div>
          </div>

        </TabsContent>


        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF4B4B] text-white shadow-[0_3px_0_0_#E63E3E]">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cấu hình nâng cao</h3>
                <p className="text-sm text-muted-foreground">Các thiết lập nâng cao</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Độ sâu công cụ tối đa</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.maxToolDepth}
                    onChange={(e) => updateBotSetting('maxToolDepth', Number(e.target.value))}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Giới hạn tốc độ (ms)</Label>
                  <Input
                    type="number"
                    value={localSettings.bot.rateLimitMs}
                    onChange={(e) => updateBotSetting('rateLimitMs', Number(e.target.value))}
                    className="h-11 rounded-xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Admin User ID</Label>
                  <Input
                    value={localSettings.adminUserId}
                    onChange={(e) => setLocalSettings({ ...localSettings, adminUserId: e.target.value })}
                    className="h-11 rounded-xl border-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <SettingToggle
                  label="Tự nghe"
                  description="Bot nghe tin nhắn của chính mình"
                  checked={localSettings.bot.selfListen}
                  onCheckedChange={(v) => updateBotSetting('selfListen', v)}
                  icon={MessageSquare}
                  color="#1CB0F6"
                />
                <SettingToggle
                  label="Ghi log ra file"
                  description="Ghi nhật ký ra file thay vì console"
                  checked={localSettings.bot.fileLogging}
                  onCheckedChange={(v) => updateBotSetting('fileLogging', v)}
                  icon={Database}
                  color="#777777"
                />
              </div>
            </div>
          </div>

          {/* Allowed User IDs */}
          <div className="rounded-2xl border-2 border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Allowed User IDs</h3>
                <p className="text-sm text-muted-foreground">Danh sách user ID được phép sử dụng bot (để trống = tất cả)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">User IDs (mỗi dòng 1 ID)</Label>
              <Textarea
                value={(localSettings.allowedUserIds ?? []).join('\n')}
                onChange={(e) => updateAllowedUserIds(e.target.value)}
                placeholder="Để trống để cho phép tất cả user..."
                rows={4}
                className="rounded-xl border-2 resize-none font-mono text-sm"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Setting Toggle Component
function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  icon: Icon,
  color,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border-2 border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        style={{ backgroundColor: checked ? color : undefined }}
      />
    </div>
  );
}

// Module descriptions
function getModuleDescription(key: string): string {
  const descriptions: Record<string, string> = {
    system: 'Các lệnh hệ thống cơ bản',
    chat: 'Trò chuyện và hội thoại',
    media: 'Xử lý hình ảnh, video, audio',
    search: 'Tìm kiếm trên internet',
    social: 'Tương tác mạng xã hội',
    task: 'Quản lý công việc và nhắc nhở',
    academic: 'Hỗ trợ học tập',
    entertainment: 'Giải trí và trò chơi',
  };
  return descriptions[key] ?? '';
}
