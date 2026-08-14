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
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(serverNow);

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

    // 获取所有员工（不限制审核状态，保证历史客户数据完整）
    const { data: allEmployees } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, team_id')
      .eq('role', 'employee')
      .eq('is_deleted', false);

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

    // 获取每个员工今日新增客户数（按等级分组，历史空等级默认 A）
    const { data: todayCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('employee_id', allEmployeeIds)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 获取每个员工累计客户数（按等级分组，历史空等级默认 A）
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('employee_id', allEmployeeIds);

    // 统计每个员工的客户数（按等级分组）
    type LevelStats = { A: number; B: number; C: number; D: number };
    const todayCountMap: Record<number, LevelStats> = {};
    const totalCountMap: Record<number, LevelStats> = {};

    for (const id of allEmployeeIds) {
      todayCountMap[id] = { A: 0, B: 0, C: 0, D: 0 };
      totalCountMap[id] = { A: 0, B: 0, C: 0, D: 0 };
    }

    for (const c of todayCustomers || []) {
      const level = (c.customer_level || 'A') as keyof LevelStats;
      todayCountMap[c.employee_id][level]++;
    }

    for (const c of allCustomers || []) {
      const level = (c.customer_level || 'A') as keyof LevelStats;
      totalCountMap[c.employee_id][level]++;
    }

    // 按团队分组
    // 重要：历史数据中员工 profiles.team_id 可能为 NULL，但客户 customers.team_id 是准确的
    // 因此员工归属团队优先使用其客户的 team_id，兜底使用 profiles.team_id
    const teamStats = teams.map(team => {
      // 属于该团队的员工：profiles.team_id = team.id，或有客户的 team_id = team.id
      const teamEmployees = allEmployees.filter(e => {
        if (e.team_id === team.id) return true;
        return (allCustomers || []).some(c => c.employee_id === e.id && c.team_id === team.id);
      });
      const memberIds = teamEmployees.map(m => m.id);

      // 团队成员统计（只统计 team_id = 当前团队的客户）
      const memberStats = teamEmployees.map(m => {
        const today: LevelStats = { A: 0, B: 0, C: 0, D: 0 };
        const total: LevelStats = { A: 0, B: 0, C: 0, D: 0 };
        for (const c of todayCustomers || []) {
          if (c.employee_id === m.id && c.team_id === team.id) {
            today[(c.customer_level || 'A') as keyof LevelStats]++;
          }
        }
        for (const c of allCustomers || []) {
          if (c.employee_id === m.id && c.team_id === team.id) {
            total[(c.customer_level || 'A') as keyof LevelStats]++;
          }
        }
        const todayTotal = today.A + today.B + today.C + today.D;
        const totalAll = total.A + total.B + total.C + total.D;
        return {
          id: m.id,
          name: m.name,
          avatar_url: m.avatar_url,
          today_customers: todayTotal,
          total_customers: totalAll,
          today_levels: today,
          total_levels: total,
        };
      });

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
      
      // 团队等级统计
      const teamTodayLevels: LevelStats = { A: 0, B: 0, C: 0, D: 0 };
      const teamTotalLevels: LevelStats = { A: 0, B: 0, C: 0, D: 0 };
      for (const m of memberStats) {
        teamTodayLevels.A += m.today_levels.A;
        teamTodayLevels.B += m.today_levels.B;
        teamTodayLevels.C += m.today_levels.C;
        teamTodayLevels.D += m.today_levels.D;
        teamTotalLevels.A += m.total_levels.A;
        teamTotalLevels.B += m.total_levels.B;
        teamTotalLevels.C += m.total_levels.C;
        teamTotalLevels.D += m.total_levels.D;
      }

      return {
        team_id: team.id,
        team_name: team.team_name,
        team_code: team.team_code,
        today_customers: teamTodayCustomers,
        total_customers: teamTotalCustomers,
        today_levels: teamTodayLevels,
        total_levels: teamTotalLevels,
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
