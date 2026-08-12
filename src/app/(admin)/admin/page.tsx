import type { Metadata } from 'next';
import { StatCard } from '@/components/layout/stat-card';

export const metadata: Metadata = {
  title: '管理员工作台',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">工作台</h1>
        <p className="text-sm text-muted-foreground">
          系统数据概览
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="团队总数" value="--" description="待接入数据" />
        <StatCard title="员工总数" value="--" description="待接入数据" />
        <StatCard title="客户总数" value="--" description="待接入数据" />
        <StatCard title="今日新增客户" value="--" description="待接入数据" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            最近动态
          </h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md bg-muted/30 p-3"
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            快捷操作
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {['添加员工', '创建团队', '查看客户', '系统设置'].map((label) => (
              <button
                key={label}
                className="flex items-center justify-center rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
