'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 编辑姓名
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // 修改密码
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/profile');
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setNameValue(data.data.name);
      }
    } catch {
      toast.error('加载失败', { description: '无法获取个人信息' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvatar = useCallback(async () => {
    try {
      const res = await fetch('/api/employee/profile/avatar');
      const data = await res.json();
      if (data.success && data.data.avatar_url) {
        setAvatarUrl(data.data.avatar_url);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchAvatar();
  }, [fetchProfile, fetchAvatar]);

  // 上传头像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 前端验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('格式错误', { description: '仅支持 JPG、PNG、WEBP 格式' });
      return;
    }

    // 前端验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('文件过大', { description: '头像大小不能超过 2MB' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/employee/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setAvatarUrl(data.data.avatar_url);
        toast.success('头像已更新');
      } else {
        toast.error('上传失败', { description: data.error || '请重试' });
      }
    } catch {
      toast.error('上传失败', { description: '网络错误' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 修改姓名
  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error('姓名不能为空');
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setProfile(prev => prev ? { ...prev, name: nameValue.trim() } : null);
        setEditingName(false);
        toast.success('姓名已更新');
      } else {
        toast.error('修改失败', { description: data.error || '请重试' });
      }
    } catch {
      toast.error('修改失败', { description: '网络错误' });
    } finally {
      setSavingName(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('请填写所有密码字段');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/employee/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
        toast.success('密码修改成功', { description: '请使用新密码登录' });
      } else {
        toast.error('修改失败', { description: data.error || '请重试' });
      }
    } catch {
      toast.error('修改失败', { description: '网络错误' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">个人中心</h1>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">个人中心</h1>
          <p className="text-sm text-muted-foreground">无法加载个人信息</p>
        </div>
      </div>
    );
  }

  const statusVariant = profile.status === 'active' ? 'default' : profile.status === 'pending' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">个人中心</h1>
        <p className="text-sm text-muted-foreground">查看和修改个人信息</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：头像和基本信息 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 头像区域 */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="头像"
                    className="h-24 w-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground border-2 border-border">
                    {profile.name.charAt(0)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="text-xs text-white font-medium">
                    {uploading ? '上传中...' : '更换头像'}
                  </span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="text-center">
                <p className="font-medium text-foreground">{profile.name}</p>
                <p className="text-sm text-muted-foreground">{profile.team_name}</p>
              </div>
              <p className="text-xs text-muted-foreground">支持 JPG/PNG/WEBP，最大 2MB</p>
            </div>

            <Separator />

            {/* 信息列表 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">用户名</span>
                <span className="text-foreground font-mono">{profile.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">所属团队</span>
                <span className="text-foreground">{profile.team_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">注册时间</span>
                <span className="text-foreground">
                  {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">账号状态</span>
                <Badge variant={statusVariant}>{profile.status_label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：设置 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 个人资料 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">个人资料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">姓名</Label>
                {editingName ? (
                  <div className="flex gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      maxLength={50}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={savingName}
                    >
                      {savingName ? '保存中...' : '保存'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingName(false);
                        setNameValue(profile.name);
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{profile.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                    >
                      修改
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">用户名</Label>
                <p className="text-foreground font-mono">{profile.username}</p>
                <p className="text-xs text-muted-foreground">用户名不可修改</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">所属团队</Label>
                <p className="text-foreground">{profile.team_name}</p>
                <p className="text-xs text-muted-foreground">团队由管理员分配，不可自行修改</p>
              </div>
            </CardContent>
          </Card>

          {/* 修改密码 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">修改密码</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPasswordForm ? (
                <Button onClick={() => setShowPasswordForm(true)}>
                  修改密码
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">旧密码</Label>
                    <Input
                      id="old-password"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="请输入当前密码"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="6-20位，字母和数字"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入新密码"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                    >
                      {changingPassword ? '修改中...' : '确认修改'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
