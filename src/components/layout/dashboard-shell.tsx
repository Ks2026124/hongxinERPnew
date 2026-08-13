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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [headerTitle]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ===== Desktop Sidebar (hidden on mobile) ===== */}
      <div className="hidden md:block">
        <AppSidebar
          title={title}
          items={navItems}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mode="fixed"
        />
      </div>

      {/* ===== Mobile Drawer Overlay ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===== Mobile Drawer Sidebar ===== */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[72vw] max-w-[300px] transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppSidebar
          title={title}
          items={navItems}
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
          mode="drawer"
        />
      </div>

      {/* ===== Main Content Area ===== */}
      <div
        className={`flex flex-col min-h-[100dvh] transition-[margin] duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        <AppHeader
          title={headerTitle}
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton
        />
        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
