import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/all-teams-stats - 获取所有团队及其员工统计
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

    // 获取服务器时间
    const { data: nowData } = await supabase.rpc('now' as any).single();
    const serverNow = nowData ? new Date(nowData as string) : new Date();
    const todayStr = serverNow.toISOString().split('T')[0];

    // 获取所有活跃团队
    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name, team_code')
      .order('id', { ascending: true });

    if (!teams || teams.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          my_team_id: user.teamId,
          teams: [],
        },
      });
    }

    // 获取所有活跃员工（属于某个团队的）
    const { data: allEmployees } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, team_id')
      .eq('role', 'employee')
      .eq('status', 'active')
      .not('team_id', 'is', null);

    if (!allEmployees || allEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          my_team_id: user.teamId,
          teams: teams.map(t => ({
            team_id: t.id,
            team_name: t.team_name,
            team_code: t.team_code,
            today_customers: 0,
            total_customers: 0,
            members: [],
          })),
        },
      });
    }

    const allEmployeeIds = allEmployees.map(e => e.id);

    // 获取每个员工今日新增客户数
    const { data: todayCounts } = await supabase
      .from('customers')
      .select('employee_id')
      .in('employee_id', allEmployeeIds)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 获取每个员工累计客户数
    const { data: totalCounts } = await supabase
      .from('customers')
      .select('employee_id')
      .in('employee_id', allEmployeeIds);

    // 统计每个员工的客户数
    const todayCountMap: Record<number, number> = {};
    const totalCountMap: Record<number, number> = {};

    for (const id of allEmployeeIds) {
      todayCountMap[id] = 0;
      totalCountMap[id] = 0;
    }

    for (const c of todayCounts || []) {
      todayCountMap[c.employee_id] = (todayCountMap[c.employee_id] || 0) + 1;
    }

    for (const c of totalCounts || []) {
      totalCountMap[c.employee_id] = (totalCountMap[c.employee_id] || 0) + 1;
    }

    // 按团队分组
    const teamStats = teams.map(team => {
      const teamMembers = allEmployees.filter(e => e.team_id === team.id);
      const memberIds = teamMembers.map(m => m.id);

      // 团队成员统计
      const memberStats = teamMembers.map(m => ({
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

      // 团队统计
      const teamTodayCustomers = memberStats.reduce((sum, m) => sum + m.today_customers, 0);
      const teamTotalCustomers = memberStats.reduce((sum, m) => sum + m.total_customers, 0);

      return {
        team_id: team.id,
        team_name: team.team_name,
        team_code: team.team_code,
        today_customers: teamTodayCustomers,
        total_customers: teamTotalCustomers,
        members: memberStats,
      };
    });

    // 团队排序：先按今日新增降序，再按累计降序
    teamStats.sort((a, b) => {
      if (b.today_customers !== a.today_customers) {
        return b.today_customers - a.today_customers;
      }
      return b.total_customers - a.total_customers;
    });

    return NextResponse.json({
      success: true,
      data: {
        my_team_id: user.teamId,
        teams: teamStats,
      },
    });
  } catch (err) {
    console.error('获取所有团队统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
