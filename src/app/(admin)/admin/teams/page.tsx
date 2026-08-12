import type { Metadata } from 'next';
import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const metadata: Metadata = {
  title: '团队管理',
};

export default function AdminTeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">团队管理</h1>
          <p className="text-sm text-muted-foreground">
            管理团队信息、成员分配
          </p>
        </div>
      </div>

      <PagePlaceholder
        title="团队管理"
        description="此页面将展示团队列表、创建团队、编辑团队信息等功能，待后续开发。"
      />
    </div>
  );
}
