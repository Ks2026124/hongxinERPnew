import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = {
  title: '员工管理',
};

export default function AdminEmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">员工管理</h1>
          <p className="text-sm text-muted-foreground">
            管理员工账号、角色分配
          </p>
        </div>
      </div>

      <PagePlaceholder
        title="员工管理"
        description="此页面将展示员工列表、添加员工、编辑员工信息、分配角色等功能，待后续开发。"
      />
    </div>
  );
}
