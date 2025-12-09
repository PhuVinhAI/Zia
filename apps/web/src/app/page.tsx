import { StatsCards } from '@/components/dashboard/stats-cards';
import { MessageChart } from '@/components/dashboard/message-chart';
import { ActiveThreads } from '@/components/dashboard/active-threads';
import { Sparkles } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#58CC02] text-white shadow-[0_4px_0_0_#46A302]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
              <p className="text-muted-foreground font-medium">
                Chào mừng trở lại! Đây là tình trạng hệ thống của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MessageChart />
        <ActiveThreads />
      </div>
    </div>
  );
}
