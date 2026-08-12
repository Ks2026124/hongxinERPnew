'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { adminNavItems } from '@/components/layout/app-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      title="鸿信ERP"
      headerTitle="管理后台"
      navItems={adminNavItems}
    >
      {children}
    </DashboardShell>
  );
}
