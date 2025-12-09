'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Monitor, Bell } from 'lucide-react';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-card">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-muted" />

        <div className="flex-1" />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-muted relative"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF4B4B] rounded-full" />
        </Button>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-muted"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all text-[#FF9600] dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all text-[#CE82FF] dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Đổi giao diện</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-2 p-2">
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className={`rounded-lg cursor-pointer ${theme === 'light' ? 'bg-[#FF9600]/10 text-[#FF9600]' : ''}`}
            >
              <Sun className="mr-2 h-4 w-4" />
              <span className="font-medium">Sáng</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className={`rounded-lg cursor-pointer ${theme === 'dark' ? 'bg-[#CE82FF]/10 text-[#CE82FF]' : ''}`}
            >
              <Moon className="mr-2 h-4 w-4" />
              <span className="font-medium">Tối</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className={`rounded-lg cursor-pointer ${theme === 'system' ? 'bg-[#1CB0F6]/10 text-[#1CB0F6]' : ''}`}
            >
              <Monitor className="mr-2 h-4 w-4" />
              <span className="font-medium">Hệ thống</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar */}
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1CB0F6] text-white font-bold text-sm shadow-[0_3px_0_0_#1899D6]">
          ZA
        </div>
      </div>
    </header>
  );
}
