'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Contact,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AppSidebarProps {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ title, items, collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-[100dvh] border-r border-border bg-sidebar transition-all duration-300',
        'pb-[env(safe-area-inset-bottom)]',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex min-h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        {!collapsed ? (
          <Link href={title.includes('管理员') ? '/admin' : '/employee'} className="flex items-center gap-2">
            <img src="/icon-192x192.png" alt="鸿信ERP" className="h-8 w-8 rounded-lg" />
            <h1 className="text-base font-semibold text-sidebar-foreground truncate">
              {title}
            </h1>
          </Link>
        ) : (
          <Link href={title.includes('管理员') ? '/admin' : '/employee'} className="flex items-center justify-center w-full">
            <img src="/icon-192x192.png" alt="鸿信ERP" className="h-8 w-8 rounded-lg" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 shrink-0"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>
      <Separator />
      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-all duration-200',
                isActive
                  ? 'bg-[#C4956A]/10 text-[#C4956A] font-medium border-r-2 border-[#C4956A]'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export const adminNavItems = [
  { label: '工作台', href: '/admin', icon: LayoutDashboard },
  { label: '团队管理', href: '/admin/teams', icon: Users },
  { label: '员工管理', href: '/admin/employees', icon: UserCog },
  { label: '客户管理', href: '/admin/customers', icon: Contact },
];

export const employeeNavItems = [
  { label: '工作台', href: '/employee', icon: LayoutDashboard },
  { label: '我的客户', href: '/employee/customers', icon: Contact },
  { label: '个人中心', href: '/employee/profile', icon: UserCog },
];
