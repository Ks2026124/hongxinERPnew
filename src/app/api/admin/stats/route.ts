import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

type Levels = { A: number; B: number; C: number; D: number };
type Transitions = { A_to_B: number; B_to_C: number; C_to_D: number };

const emptyLevels = (): Levels => ({ A: 0, B: 0, C: 0, D: 0 });
const emptyTransitions = (): Transitions => ({ A_to_B: 0, B_to_C: 0, C_to_D: 0 });

function getDateRange(range: string | null, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);

  if (range === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (range === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (range === 'custom' && customStart && customEnd) {
    start = new Date(customStart + 'T00:00:00');
    end = new Date(customEnd + 'T00:00:00');
  }

  return {
    startStr: start.toISOString().split('T')[0],
    endStr: end.toISOString().split('T')[0],
  };
}

// GET /api/admin/stats - 管理员统计（所有团队）
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';
    const customStart = searchParams.get('start');
    const customEnd = searchParams.get('end');
    const { startStr, endStr } = getDateRange(range, customStart, customEnd);
    const rangeStart = startStr + 'T00:00:00';
    const rangeEnd = endStr + 'T23:59:59';

    const supabase = getSupabaseClient();

    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name, team_code')
      .order('team_name');

    if (!teams || teams.length === 0) {
      return NextResponse.json({ success: true, data: { teams: [], date_range: { start: startStr, end: endStr } } });
    }

    const teamIds = teams.map(t => t.id);

    const { data: employees } = await supabase
      .from('profiles')
      .select('id, name, team_id, avatar_url')
      .eq('role', 'employee')
      .eq('status', 'active')
      .in('team_id', teamIds);

    const { data: rangeCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level, created_at')
      .in('team_id', teamIds)
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd);

    const { data: allCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level')
      .in('team_id', teamIds);

    const { data: rangeTransitions } = await supabase
      .from('customer_level_logs')
      .select('employee_id, team_id, from_level, to_level, created_at')
      .gte('created_at', rangeStart)
      .lte('created_at', rangeEnd);

    const teamTodayMap: Record<number, number> = {};
    const teamTotalMap: Record<number, number> = {};
    const teamLevelMap: Record<number, Levels> = {};
    const teamTodayLevelMap: Record<number, Levels> = {};
    const teamTransitionMap: Record<number, Transitions> = {};
    const empTodayMap: Record<number, number> = {};
    const empTotalMap: Record<number, number> = {};
    const empLevelMap: Record<number, Levels> = {};
    const empTodayLevelMap: Record<number, Levels> = {};
    const empTransitionMap: Record<number, Transitions> = {};

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

    for (const c of rangeCustomers || []) {
      teamTodayMap[c.team_id] = (teamTodayMap[c.team_id] || 0) + 1;
      empTodayMap[c.employee_id] = (empTodayMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as keyof Levels;
      const teamTodayLevels = teamTodayLevelMap[c.team_id] ?? emptyLevels();
      const empTodayLevels = empTodayLevelMap[c.employee_id] ?? emptyLevels();
      teamTodayLevels[level] += 1;
      empTodayLevels[level] += 1;
      teamTodayLevelMap[c.team_id] = teamTodayLevels;
      empTodayLevelMap[c.employee_id] = empTodayLevels;
    }

    for (const c of allCustomers || []) {
      teamTotalMap[c.team_id] = (teamTotalMap[c.team_id] || 0) + 1;
      empTotalMap[c.employee_id] = (empTotalMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as keyof Levels;
      const teamLevels = teamLevelMap[c.team_id] ?? emptyLevels();
      const empLevels = empLevelMap[c.employee_id] ?? emptyLevels();
      teamLevels[level] += 1;
      empLevels[level] += 1;
      teamLevelMap[c.team_id] = teamLevels;
      empLevelMap[c.employee_id] = empLevels;
    }

    const totalTransitions = emptyTransitions();
    for (const log of rangeTransitions || []) {
      const key = `${log.from_level}_to_${log.to_level}` as keyof Transitions;
      if (key in totalTransitions) {
        totalTransitions[key] += 1;
        const teamTransitions = teamTransitionMap[log.team_id] ?? emptyTransitions();
        const empTransitions = empTransitionMap[log.employee_id] ?? emptyTransitions();
        teamTransitions[key] += 1;
        empTransitions[key] += 1;
        teamTransitionMap[log.team_id] = teamTransitions;
        empTransitionMap[log.employee_id] = empTransitions;
      }
    }

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
          if (b.today_customers !== a.today_customers) return b.today_customers - a.today_customers;
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
        date_range: { start: startStr, end: endStr },
      },
    });
  } catch (err) {
    console.error('获取管理员统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
