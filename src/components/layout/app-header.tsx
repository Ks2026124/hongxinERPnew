'use client';

import { useEffect, useState } from 'react';
import { Bell, LogOut, Menu, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserInfo {
  name: string;
  role: string;
  username: string;
}

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function AppHeader({
  title,
  onMenuClick,
  showMenuButton = false,
}: AppHeaderProps) {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setUserInfo({
          name: data.name || data.username,
          role: data.role,
          username: data.username,
        });
      })
      .catch(() => {
        // Silently fail - user will be redirected by middleware
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Display name: admin shows "管理员", employee shows their name
  const displayName = userInfo
    ? userInfo.role === 'admin'
      ? '管理员'
      : userInfo.name
    : '';

  return (
    <header className="sticky top-0 z-20 flex min-h-12 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:min-h-14 md:px-6 md:pb-2">
      <div className="flex items-center gap-2 min-w-0">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 md:gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{displayName || '加载中...'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              个人信息
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
