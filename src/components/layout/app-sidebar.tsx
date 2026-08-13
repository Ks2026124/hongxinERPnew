'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Contact,
  ChevronLeft,
  X,
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
  mode?: 'fixed' | 'drawer';
}

export function AppSidebar({ title, items, collapsed, onToggle, mode = 'fixed' }: AppSidebarProps) {
  const pathname = usePathname();
  const isDrawer = mode === 'drawer';
  const widthClass = isDrawer ? 'w-full' : (collapsed ? 'w-16' : 'w-60');

  return (
    <aside
      className={cn(
        'h-[100dvh] border-r border-border bg-sidebar flex flex-col',
        widthClass,
        isDrawer && 'relative',
        !isDrawer && 'fixed left-0 top-0 z-30',
        'transition-all duration-300'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center shrink-0',
        isDrawer
          ? 'px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 h-auto'
          : 'px-4 pt-[env(safe-area-inset-top)] h-14 min-h-14'
      )}>
        {!collapsed ? (
          <Link
            href={title.includes('管理员') ? '/admin' : '/employee'}
            className="flex items-center gap-2.5 flex-1 min-w-0"
          >
            <img src="/icon-192x192.png" alt="鸿信ERP" className={cn("rounded-lg shrink-0", isDrawer ? "h-9 w-9" : "h-8 w-8")} />
            <h1 className={cn("font-semibold text-sidebar-foreground truncate", isDrawer ? "text-lg" : "text-base")}>
              {title}
            </h1>
          </Link>
        ) : (
          <Link
            href={title.includes('管理员') ? '/admin' : '/employee'}
            className="flex items-center justify-center w-full"
          >
            <img src="/icon-192x192.png" alt="鸿信ERP" className="h-8 w-8 rounded-lg" />
          </Link>
        )}
        {isDrawer ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
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
        )}
      </div>
      <Separator />

      {/* Navigation */}
      <nav className={cn(
        'flex flex-col overflow-y-auto flex-1',
        isDrawer
          ? 'gap-0.5 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'
          : 'gap-1 p-2 pb-[env(safe-area-inset-bottom)]'
      )}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-md transition-all duration-200 w-full',
                isDrawer
                  ? 'gap-3 px-3 py-3 text-[15px]'
                  : 'gap-3 px-3 py-2.5 text-sm',
                isActive
                  ? 'bg-blue-500/10 text-blue-600 font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn("shrink-0", isDrawer ? "h-5 w-5" : "h-4 w-4")} />
              {(!collapsed || isDrawer) && <span className="truncate">{item.label}</span>}
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
