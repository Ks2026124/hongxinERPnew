'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';

interface DashboardShellProps {
  title: string;
  headerTitle: string;
  navItems: {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  headerTitle,
  navItems,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarWidth = isMobile
    ? mobileOpen
      ? '15rem'
      : '0rem'
    : collapsed
      ? '4rem'
      : '15rem';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={
          isMobile
            ? `fixed inset-y-0 left-0 z-40 transition-transform duration-300 ${
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : ''
        }
      >
        <AppSidebar
          title={title}
          items={navItems}
          collapsed={!isMobile && collapsed}
          onToggle={() => {
            if (isMobile) {
              setMobileOpen(!mobileOpen);
            } else {
              setCollapsed(!collapsed);
            }
          }}
        />
      </div>

      {/* Main content */}
      <div
        className="transition-all duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarWidth }}
      >
        <AppHeader
          title={headerTitle}
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton={isMobile}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
