import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: '个人中心',
};

export default function EmployeeProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">个人中心</h1>
        <p className="text-sm text-muted-foreground">
          查看和修改个人信息
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                --
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">待登录</p>
                <p className="text-sm text-muted-foreground">员工</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">姓名</span>
                <span className="text-foreground">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">手机号</span>
                <span className="text-foreground">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">所属团队</span>
                <span className="text-foreground">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">入职时间</span>
                <span className="text-foreground">--</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">账号设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                修改密码、绑定手机号等账号安全设置将在此处展示，待后续开发。
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                通知偏好、界面设置等个人偏好将在此处配置，待后续开发。
              </p>
            </div>
            <div className="pt-2">
              <Button variant="outline" disabled>
                保存修改
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
