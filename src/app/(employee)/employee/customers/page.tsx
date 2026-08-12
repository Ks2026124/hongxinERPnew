import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = {
  title: '我的客户',
};

export default function EmployeeCustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">我的客户</h1>
          <p className="text-sm text-muted-foreground">
            管理我添加的客户资料
          </p>
        </div>
      </div>

      <PagePlaceholder
        title="我的客户"
        description="此页面将展示我添加的客户列表、添加客户、编辑客户资料、上传聊天截图等功能，待后续开发。"
      />
    </div>
  );
}
