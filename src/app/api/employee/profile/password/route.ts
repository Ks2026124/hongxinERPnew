import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword, validatePassword } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/employee/profile/password - 修改密码
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { old_password, new_password, confirm_password } = body;

    // 验证必填字段
    if (!old_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: '请填写所有密码字段' },
        { status: 400 }
      );
    }

    // 验证新密码格式
    const passwordCheck = validatePassword(new_password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
    }

    // 验证两次输入一致
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: '两次输入的新密码不一致' },
        { status: 400 }
      );
    }

    // 新旧密码不能相同
    if (old_password === new_password) {
      return NextResponse.json(
        { error: '新密码不能与旧密码相同' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 获取当前密码哈希
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('password_hash')
      .eq('id', user.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 验证旧密码
    const isMatch = await verifyPassword(old_password, profile.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: '旧密码不正确' },
        { status: 400 }
      );
    }

    // 哈希新密码并更新
    const newHash = await hashPassword(new_password);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', user.userId);

    if (updateError) {
      console.error('更新密码失败:', updateError);
      return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (err) {
    console.error('修改密码失败:', err);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
