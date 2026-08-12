import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // Login doesn't enforce username format - just check non-empty
    // Format validation only applies to registration

    const client = getSupabaseClient();

    // Find user by username
    const { data: profile, error } = await client
      .from('profiles')
      .select('id, username, password_hash, name, role, team_id, status, must_change_password')
      .eq('username', username)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);

    if (!profile) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查账号是否已被删除
    if ((profile as any).is_deleted) {
      return NextResponse.json(
        { error: '该账号已被删除，无法登录' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // Check status
    if (profile.status !== 'active') {
      const statusMessages: Record<string, string> = {
        pending: '账号正在审核中，请等待管理员审批',
        rejected: '账号审核未通过，请联系管理员',
        disabled: '账号已被禁用，请联系管理员',
      };
      return NextResponse.json(
        { error: statusMessages[profile.status] || '账号状态异常，无法登录' },
        { status: 403 }
      );
    }

    // Create session
    const token = await createSession({
      userId: profile.id,
      username: profile.username,
      role: profile.role,
      teamId: profile.team_id,
      name: profile.name,
      status: profile.status,
      mustChangePassword: profile.must_change_password || false,
    });

    await setSessionCookie(token);

    // Determine redirect path
    let redirect = profile.role === 'admin' ? '/admin' : '/employee';
    if (profile.role === 'employee' && profile.must_change_password) {
      redirect = '/employee/change-password';
    }

    return NextResponse.json({
      success: true,
      data: {
        role: profile.role,
        name: profile.name,
        must_change_password: profile.must_change_password || false,
        redirect,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
