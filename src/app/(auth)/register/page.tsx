'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Team {
  id: number;
  team_code: string;
  team_name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    team_id: '',
    username: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [teamError, setTeamError] = useState('');

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        if (res.ok && data.data) {
          setTeams(data.data);
          if (data.data.length === 0) {
            setTeamError('暂无可用团队，请联系管理员创建团队');
          }
        } else {
          setTeamError(data.error || '加载团队列表失败');
        }
      } catch {
        setTeamError('网络错误，无法加载团队列表');
      } finally {
        setLoadingTeams(false);
      }
    }
    fetchTeams();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.team_id) {
      setError('请选择所属团队');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          password: formData.password,
          confirm_password: formData.confirm_password,
          team_id: parseInt(formData.team_id, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        return;
      }

      setSuccess(true);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              注册成功
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              您的账号已提交审核，请等待管理员审批后再登录。
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => router.push('/login')}
            >
              返回登录
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <img src="/icon-192x192.png" alt="鸿信ERP" className="h-16 w-16 rounded-xl" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">注册</h2>
        <p className="text-sm text-muted-foreground">
          创建您的员工账号
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="team_id">所属团队</Label>
            <Select
              value={formData.team_id}
              onValueChange={(val) => handleChange('team_id', val)}
              disabled={loadingTeams}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTeams ? '加载中...' : '请选择团队'} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamError && (
              <p className="text-sm text-destructive">{teamError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              placeholder="请输入真实姓名"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">账号</Label>
            <Input
              id="username"
              placeholder="6-20位数字或英文字母"
              autoComplete="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="6-20位数字或英文字母"
                autoComplete="new-password"
                className="pr-10"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
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
          <div className="space-y-2">
            <Label htmlFor="confirm_password">确认密码</Label>
            <Input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              autoComplete="new-password"
              value={formData.confirm_password}
              onChange={(e) => handleChange('confirm_password', e.target.value)}
              required
            />
          </div>
          <Button
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              '注册'
            )}
          </Button>
        </CardContent>
      </form>
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
