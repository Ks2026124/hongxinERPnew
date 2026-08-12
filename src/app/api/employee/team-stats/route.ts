import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/team-stats - 团队动态和排行榜
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    if (!user.teamId) {
      return NextResponse.json({
        success: true,
        data: {
          team_name: '未分配团队',
          team_today_customers: 0,
          members: [],
        },
      });
    }

    const supabase = getSupabaseClient();

    // 获取服务器时间
    const { data: nowData } = await supabase.rpc('now' as any).single();
    const serverNow = nowData ? new Date(nowData as string) : new Date();
    const todayStr = serverNow.toISOString().split('T')[0];

    // 获取团队信息
    const { data: team } = await supabase
      .from('teams')
      .select('id, team_name')
      .eq('id', user.teamId)
      .single();

    // 获取团队成员（active 状态）
    const { data: members } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('team_id', user.teamId)
      .eq('role', 'employee')
      .eq('status', 'active');

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          team_name: team?.team_name || '未知团队',
          team_today_customers: 0,
          members: [],
        },
      });
    }

    const memberIds = members.map(m => m.id);

    // 获取每个成员今日新增客户数
    const { data: todayCounts } = await supabase
      .from('customers')
      .select('employee_id')
      .in('employee_id', memberIds)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 获取每个成员累计客户数
    const { data: totalCounts } = await supabase
      .from('customers')
      .select('employee_id')
      .in('employee_id', memberIds);

    // 统计
    const todayCountMap: Record<number, number> = {};
    const totalCountMap: Record<number, number> = {};

    for (const id of memberIds) {
      todayCountMap[id] = 0;
      totalCountMap[id] = 0;
    }

    for (const c of todayCounts || []) {
      todayCountMap[c.employee_id] = (todayCountMap[c.employee_id] || 0) + 1;
    }

    for (const c of totalCounts || []) {
      totalCountMap[c.employee_id] = (totalCountMap[c.employee_id] || 0) + 1;
    }

    // 组合数据并排序
    const memberStats = members.map(m => ({
      id: m.id,
      name: m.name,
      avatar_url: m.avatar_url,
      today_customers: todayCountMap[m.id] || 0,
      total_customers: totalCountMap[m.id] || 0,
    }));

    // 排序：先按今日新增降序，再按累计降序
    memberStats.sort((a, b) => {
      if (b.today_customers !== a.today_customers) {
        return b.today_customers - a.today_customers;
      }
      return b.total_customers - a.total_customers;
    });

    // 团队今日新增总数
    const teamTodayCustomers = Object.values(todayCountMap).reduce((sum, v) => sum + v, 0);

    return NextResponse.json({
      success: true,
      data: {
        team_name: team?.team_name || '未知团队',
        team_today_customers: teamTodayCustomers,
        members: memberStats,
      },
    });
  } catch (err) {
    console.error('获取团队统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
