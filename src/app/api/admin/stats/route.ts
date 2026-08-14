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

    // 获取今日新增客户（包含等级）
    const { data: todayCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('team_id', teamIds)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 获取累计客户（包含等级信息）
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('team_id', teamIds);

    // 获取今日等级变化记录（包含 employee_id）
    const { data: todayTransitions } = await supabase
      .from('customer_level_logs')
      .select('employee_id, team_id, from_level, to_level')
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 初始化统计 Map
    const teamTodayMap: Record<number, number> = {};
    const teamTotalMap: Record<number, number> = {};
    const teamLevelMap: Record<number, { A: number; B: number; C: number; D: number }> = {};
    const teamTodayLevelMap: Record<number, { A: number; B: number; C: number; D: number }> = {};
    const teamTransitionMap: Record<number, { A_to_B: number; B_to_C: number; C_to_D: number }> = {};
    
    const empTodayMap: Record<number, number> = {};
    const empTotalMap: Record<number, number> = {};
    const empLevelMap: Record<number, { A: number; B: number; C: number; D: number }> = {};
    const empTodayLevelMap: Record<number, { A: number; B: number; C: number; D: number }> = {};
    const empTransitionMap: Record<number, { A_to_B: number; B_to_C: number; C_to_D: number }> = {};

    const emptyLevels = (): { A: number; B: number; C: number; D: number } => ({ A: 0, B: 0, C: 0, D: 0 });
    const emptyTransitions = (): { A_to_B: number; B_to_C: number; C_to_D: number } => ({ A_to_B: 0, B_to_C: 0, C_to_D: 0 });

    for (const id of teamIds) {
      teamTodayMap[id] = 0;
      teamTotalMap[id] = 0;
      teamLevelMap[id] = emptyLevels();
      teamTodayLevelMap[id] = emptyLevels();
      teamTransitionMap[id] = emptyTransitions();
    }

    for (const emp of employees || []) {
      empTodayMap[emp.id] = 0;
      empTotalMap[emp.id] = 0;
      empLevelMap[emp.id] = emptyLevels();
      empTodayLevelMap[emp.id] = emptyLevels();
      empTransitionMap[emp.id] = emptyTransitions();
    }

    // 统计今日新增
    for (const c of todayCustomers || []) {
      teamTodayMap[c.team_id] = (teamTodayMap[c.team_id] || 0) + 1;
      empTodayMap[c.employee_id] = (empTodayMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';
      if (teamTodayLevelMap[c.team_id]) {
        teamTodayLevelMap[c.team_id][level]++;
      }
      if (empTodayLevelMap[c.employee_id]) {
        empTodayLevelMap[c.employee_id][level]++;
      }
    }

    // 统计累计客户和当前等级分布
    for (const c of allCustomers || []) {
      teamTotalMap[c.team_id] = (teamTotalMap[c.team_id] || 0) + 1;
      empTotalMap[c.employee_id] = (empTotalMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';
      if (teamLevelMap[c.team_id]) {
        teamLevelMap[c.team_id][level]++;
      }
      if (empLevelMap[c.employee_id]) {
        empLevelMap[c.employee_id][level]++;
      }
    }

    // 统计今日转化
    const totalTransitions = emptyTransitions();
    for (const log of todayTransitions || []) {
      if (log.from_level === 'A' && log.to_level === 'B') {
        totalTransitions.A_to_B++;
        if (teamTransitionMap[log.team_id]) teamTransitionMap[log.team_id].A_to_B++;
        if (empTransitionMap[log.employee_id]) empTransitionMap[log.employee_id].A_to_B++;
      }
      if (log.from_level === 'B' && log.to_level === 'C') {
        totalTransitions.B_to_C++;
        if (teamTransitionMap[log.team_id]) teamTransitionMap[log.team_id].B_to_C++;
        if (empTransitionMap[log.employee_id]) empTransitionMap[log.employee_id].B_to_C++;
      }
      if (log.from_level === 'C' && log.to_level === 'D') {
        totalTransitions.C_to_D++;
        if (teamTransitionMap[log.team_id]) teamTransitionMap[log.team_id].C_to_D++;
        if (empTransitionMap[log.employee_id]) empTransitionMap[log.employee_id].C_to_D++;
      }
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
          level_stats: empLevelMap[e.id] || emptyLevels(),
          today_level_stats: empTodayLevelMap[e.id] || emptyLevels(),
          transitions: empTransitionMap[e.id] || emptyTransitions(),
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
        level_stats: teamLevelMap[t.id] || emptyLevels(),
        today_level_stats: teamTodayLevelMap[t.id] || emptyLevels(),
        transitions: teamTransitionMap[t.id] || emptyTransitions(),
        employees: teamEmployees,
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        teams: teamStats,
        today_transitions: totalTransitions,
      } 
    });
  } catch (err) {
    console.error('获取管理员统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}