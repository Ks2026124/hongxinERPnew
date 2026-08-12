'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { employeeNavItems } from '@/components/layout/app-sidebar';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      title="鸿信ERP"
      headerTitle="员工工作台"
      navItems={employeeNavItems}
    >
      {children}
    </DashboardShell>
  );
}
