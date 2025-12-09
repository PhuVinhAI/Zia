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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const navItems = [
  {
    title: 'Tổng quan',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Lịch sử',
    href: '/history',
    icon: MessageSquare,
  },
  {
    title: 'Bộ nhớ',
    href: '/memories',
    icon: Brain,
  },
  {
    title: 'Tác vụ',
    href: '/tasks',
    icon: ListTodo,
  },
  {
    title: 'Nhật ký',
    href: '/logs',
    icon: FileText,
  },
  {
    title: 'Backup',
    href: '/backup',
    icon: HardDrive,
  },
  {
    title: 'Cài đặt',
    href: '/settings',
    icon: Settings,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <span className="font-bold text-lg">Zia Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
