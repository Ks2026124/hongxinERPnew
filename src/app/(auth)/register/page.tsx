'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardHeader className="text-center">
        <h2 className="text-lg font-semibold text-foreground">注册</h2>
        <p className="text-sm text-muted-foreground">
          创建您的员工账号
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" placeholder="请输入真实姓名" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">手机号</Label>
          <Input id="phone" placeholder="请输入手机号" type="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">账号</Label>
          <Input
            id="username"
            placeholder="请设置登录账号"
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请设置登录密码"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <Button className="w-full" size="lg">
          注册
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          已有账号？{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            立即登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
