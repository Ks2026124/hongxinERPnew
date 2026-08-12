'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card>
      <CardHeader className="text-center">
        <h2 className="text-lg font-semibold text-foreground">登录</h2>
        <p className="text-sm text-muted-foreground">
          请输入您的账号和密码
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">账号</Label>
          <Input
            id="username"
            placeholder="请输入账号"
            autoComplete="username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              autoComplete="current-password"
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
          登录
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          还没有账号？{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            立即注册
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
