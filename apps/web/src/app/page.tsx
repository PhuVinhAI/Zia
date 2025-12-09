import { StatsCards } from '@/components/dashboard/stats-cards';
import { MessageChart } from '@/components/dashboard/message-chart';
import { ActiveThreads } from '@/components/dashboard/active-threads';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống Zia Bot</p>
      </div>

      <StatsCards />

      <div className="grid gap-6 md:grid-cols-2">
        <MessageChart />
        <ActiveThreads />
      </div>
    </div>
  );
}
