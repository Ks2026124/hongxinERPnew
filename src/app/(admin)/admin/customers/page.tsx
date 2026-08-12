import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = {
  title: '客户管理',
};

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">客户管理</h1>
          <p className="text-sm text-muted-foreground">
            查看和管理所有客户资料
          </p>
        </div>
      </div>

      <PagePlaceholder
        title="客户管理"
        description="此页面将展示全部客户列表、客户详情、客户分配等功能，待后续开发。"
      />
    </div>
  );
}
