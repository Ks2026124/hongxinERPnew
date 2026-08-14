import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/admin/stats - 管理员统计（所有团队）
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取服务器时间
    const { data: nowData } = await supabase.rpc('now' as any).single();
    const serverNow = nowData ? new Date(nowData as string) : new Date();
    const todayStr = serverNow.toISOString().split('T')[0];

    // 获取所有团队
    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name, team_code')
      .order('team_name');

    if (!teams || teams.length === 0) {
      return NextResponse.json({ success: true, data: { teams: [] } });
    }

    const teamIds = teams.map(t => t.id);

    // 获取所有 active 员工
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, name, team_id, avatar_url')
      .eq('role', 'employee')
      .eq('status', 'active')
      .in('team_id', teamIds);

    // 获取今日新增客户
    const { data: todayCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id')
      .in('team_id', teamIds)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 获取累计客户（包含等级信息）
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('team_id', teamIds);

    // 统计
    const teamTodayMap: Record<number, number> = {};
    const teamTotalMap: Record<number, number> = {};
    const teamLevelMap: Record<number, { A: number; B: number; C: number; D: number }> = {};
    const empTodayMap: Record<number, number> = {};
    const empTotalMap: Record<number, number> = {};

    for (const id of teamIds) {
      teamTodayMap[id] = 0;
      teamTotalMap[id] = 0;
      teamLevelMap[id] = { A: 0, B: 0, C: 0, D: 0 };
    }

    for (const emp of employees || []) {
      empTodayMap[emp.id] = 0;
      empTotalMap[emp.id] = 0;
    }

    for (const c of todayCustomers || []) {
      teamTodayMap[c.team_id] = (teamTodayMap[c.team_id] || 0) + 1;
      empTodayMap[c.employee_id] = (empTodayMap[c.employee_id] || 0) + 1;
    }

    for (const c of allCustomers || []) {
      teamTotalMap[c.team_id] = (teamTotalMap[c.team_id] || 0) + 1;
      empTotalMap[c.employee_id] = (empTotalMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';
      teamLevelMap[c.team_id][level]++;
    }

    // 组合团队数据
    const teamStats = teams.map(t => {
      const teamEmployees = (employees || [])
        .filter(e => e.team_id === t.id)
        .map(e => ({
          id: e.id,
          name: e.name,
          avatar_url: e.avatar_url,
          today_customers: empTodayMap[e.id] || 0,
          total_customers: empTotalMap[e.id] || 0,
        }))
        .sort((a, b) => {
          if (b.today_customers !== a.today_customers) {
            return b.today_customers - a.today_customers;
          }
          return b.total_customers - a.total_customers;
        });

      return {
        id: t.id,
        team_name: t.team_name,
        team_code: t.team_code,
        today_customers: teamTodayMap[t.id] || 0,
        total_customers: teamTotalMap[t.id] || 0,
        level_stats: teamLevelMap[t.id],
        employees: teamEmployees,
      };
    });

    return NextResponse.json({ success: true, data: { teams: teamStats } });
  } catch (err) {
    console.error('获取管理员统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
