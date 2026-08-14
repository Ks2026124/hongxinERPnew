'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from '@/components/employee-avatar';

interface ProfileData {
  id: number;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  team_id: number | null;
  team_name: string;
  status: string;
  status_label: string;
  avatar_url: string | null;
  created_at: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAvatar();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/profile');
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (err) {
      console.error('获取个人信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatar = async () => {
    try {
      const res = await fetch('/api/employee/profile/avatar');
      const data = await res.json();
      if (data.success && data.data.avatar_url) {
        setAvatarUrl(data.data.avatar_url);
      }
    } catch (err) {
      console.error('获取头像失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">无法加载个人信息</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人中心</h1>
        <p className="text-muted-foreground mt-1">查看您的账户信息</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <EmployeeAvatar 
                name={profile.name || profile.username} 
                src={avatarUrl}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold">{profile.name || profile.username}</h3>
                <Badge variant="secondary" className="mt-1">
                  {profile.role === 'admin' ? '管理员' : '员工'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div>
                <p className="text-sm text-muted-foreground">用户名</p>
                <p className="font-medium">{profile.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">姓名</p>
                <p className="font-medium">{profile.name || '未设置'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">手机号</p>
                <p className="font-medium">{profile.phone || '未设置'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 账户信息 */}
        <Card>
          <CardHeader>
            <CardTitle>账户信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">所属团队</p>
              <p className="font-medium">{profile.team_name || '未分配团队'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">账户状态</p>
              <Badge
                variant={profile.status === 'active' ? 'default' : 'secondary'}
                className="mt-1"
              >
                {profile.status_label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">注册时间</p>
              <p className="font-medium">
                {new Date(profile.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
