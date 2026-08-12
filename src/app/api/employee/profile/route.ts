import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/profile - 获取当前员工个人信息
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取员工信息 + 团队名称
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, name, phone, role, team_id, status, avatar_url, created_at')
      .eq('id', user.userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: '未找到个人信息' }, { status: 404 });
    }

    // 获取团队名称
    let teamName = '未分配团队';
    if (profile.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('team_name')
        .eq('id', profile.team_id)
        .single();
      if (team) {
        teamName = team.team_name;
      }
    }

    // 状态映射
    const statusMap: Record<string, string> = {
      active: '正常',
      pending: '待审核',
      disabled: '已禁用',
    };

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        phone: profile.phone,
        role: profile.role,
        team_id: profile.team_id,
        team_name: teamName,
        status: profile.status,
        status_label: statusMap[profile.status] || profile.status,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      },
    });
  } catch (err) {
    console.error('获取个人信息失败:', err);
    return NextResponse.json({ error: '获取个人信息失败' }, { status: 500 });
  }
}

// PATCH /api/employee/profile - 修改姓名
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: '姓名不能超过50个字符' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.userId);

    if (error) {
      console.error('修改姓名失败:', error);
      return NextResponse.json({ error: '修改姓名失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '姓名修改成功' });
  } catch (err) {
    console.error('修改姓名失败:', err);
    return NextResponse.json({ error: '修改姓名失败' }, { status: 500 });
  }
}
