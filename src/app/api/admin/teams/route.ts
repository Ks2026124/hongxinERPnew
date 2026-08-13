import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, requireAdmin } from '@/lib/auth';

// GET /api/admin/teams - 获取团队列表（含员工人数）
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取所有团队
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (teamsError) throw teamsError;

    // 获取每个团队的活跃员工人数（排除已删除的员工）
    const { data: employeeCounts, error: countError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('is_deleted', false);

    if (countError) throw countError;

    // 统计每个团队的活跃员工数
    const countMap: Record<number, number> = {};
    for (const emp of employeeCounts || []) {
      if (emp.team_id) {
        countMap[emp.team_id] = (countMap[emp.team_id] || 0) + 1;
      }
    }

    // 合并员工人数到团队数据
    const teamsWithCount = (teams || []).map((team) => ({
      ...team,
      employee_count: countMap[team.id] || 0,
    }));

    return NextResponse.json({ data: teamsWithCount });
  } catch (error) {
    console.error('获取团队列表失败:', error);
    return NextResponse.json({ error: '获取团队列表失败' }, { status: 500 });
  }
}

// POST /api/admin/teams - 创建团队
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { team_code, team_name, remark } = body;

    // 验证
    if (!team_code || !team_code.trim()) {
      return NextResponse.json({ error: '团队编号不能为空' }, { status: 400 });
    }
    if (!team_name || !team_name.trim()) {
      return NextResponse.json({ error: '团队名称不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查 team_code 是否已存在
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('team_code', team_code.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: '团队编号已存在' }, { status: 400 });
    }

    // 创建团队
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        team_code: team_code.trim(),
        team_name: team_name.trim(),
        remark: remark?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error('创建团队失败:', error);
    return NextResponse.json({ error: '创建团队失败' }, { status: 500 });
  }
}
