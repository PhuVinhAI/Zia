'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  ListTodo,
  Settings,
  FileText,
  Bot,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const navItems = [
  {
    title: 'Tổng quan',
    href: '/',
    icon: LayoutDashboard,
    color: 'text-[#58CC02]',
    bgColor: 'bg-[#58CC02]/10',
  },
  {
    title: 'Lịch sử',
    href: '/history',
    icon: MessageSquare,
    color: 'text-[#1CB0F6]',
    bgColor: 'bg-[#1CB0F6]/10',
  },
  {
    title: 'Bộ nhớ',
    href: '/memories',
    icon: Brain,
    color: 'text-[#CE82FF]',
    bgColor: 'bg-[#CE82FF]/10',
  },
  {
    title: 'Tác vụ',
    href: '/tasks',
    icon: ListTodo,
    color: 'text-[#FF9600]',
    bgColor: 'bg-[#FF9600]/10',
  },
  {
    title: 'Nhật ký',
    href: '/logs',
    icon: FileText,
    color: 'text-[#3C3C3C] dark:text-[#9CA3AF]',
    bgColor: 'bg-[#3C3C3C]/10 dark:bg-[#9CA3AF]/10',
  },
  {
    title: 'Backup',
    href: '/backup',
    icon: HardDrive,
    color: 'text-[#FF4B4B]',
    bgColor: 'bg-[#FF4B4B]/10',
  },
  {
    title: 'Cài đặt',
    href: '/settings',
    icon: Settings,
    color: 'text-[#777777]',
    bgColor: 'bg-[#777777]/10',
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r-2 border-border">
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302] group-hover:shadow-[0_2px_0_0_#46A302] group-hover:translate-y-[1px] transition-all">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight">Zia</span>
            <span className="text-xs text-muted-foreground font-medium">Dashboard</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        'h-11 rounded-xl font-medium transition-all duration-200',
                        isActive
                          ? 'bg-[#58CC02] text-white shadow-[0_3px_0_0_#46A302] hover:bg-[#58CC02] hover:text-white'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                            isActive ? 'bg-white/20' : item.bgColor
                          )}
                        >
                          <item.icon
                            className={cn('h-4 w-4', isActive ? 'text-white' : item.color)}
                          />
                        </div>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#58CC02]/10 border border-[#58CC02]/20">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#58CC02] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#58CC02] truncate">Bot đang hoạt động</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#58CC02] animate-pulse" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
