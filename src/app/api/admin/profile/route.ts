import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/admin/profile - 获取管理员个人信息
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取管理员信息
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
        ...profile,
        team_name: teamName,
        status_label: statusMap[profile.status] || profile.status,
      },
    });
  } catch (error) {
    console.error('获取个人信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
