import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getShanghaiDayRange } from '@/lib/date';

type Levels = { A: number; B: number; C: number; D: number };
type Transitions = { A_to_B: number; B_to_C: number; C_to_D: number };

const emptyLevels = (): Levels => ({ A: 0, B: 0, C: 0, D: 0 });
const emptyTransitions = (): Transitions => ({ A_to_B: 0, B_to_C: 0, C_to_D: 0 });

/**
 * 把 Asia/Shanghai 时区下的日历日期 YYYY-MM-DD 转成对应的 UTC 即时点
 * （上海 00:00:00 +08:00 = UTC 前一天 16:00:00）。
 */
function shanghaiDateToUtcISO(dateStr: string, plusDays = 0): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMs = Date.UTC(y, (m || 1) - 1, (d || 1) + plusDays) - 8 * 3600 * 1000;
  return new Date(utcMs).toISOString();
}

function getDateRange(range: string | null, customStart?: string | null, customEnd?: string | null) {
  // 始终以 Asia/Shanghai 的"今天"为基准
  const today = getShanghaiDayRange();
  const todayStr = today.dateStr;
  // 昨天 = 上海今天 - 1 天
  const yesterdayStr = new Date(today.start.getTime() - 24 * 3600 * 1000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });

  let startDateStr = todayStr;
  let endDateStr = todayStr;

  if (range === 'yesterday') {
    startDateStr = yesterdayStr;
    endDateStr = yesterdayStr;
  } else if (range === '7d') {
    // 最近 7 天（含今天），按上海日期
    startDateStr = new Date(today.start.getTime() - 6 * 24 * 3600 * 1000)
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  } else if (range === 'week') {
    // 本周一 ~ 今天（按上海时区）
    const dow = today.start.getUTCDay() || 7; // 上海周一对应的 UTC 是周日 16:00
    const mondayUtc = new Date(today.start.getTime() - (dow - 1) * 86400000);
    startDateStr = mondayUtc.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
  } else if (range === 'custom' && customStart && customEnd) {
    startDateStr = customStart;
    endDateStr = customEnd;
  }

  // 统一返回 UTC ISO 边界：[上海 start 00:00, 上海 end+1 00:00)
  const startISO = shanghaiDateToUtcISO(startDateStr);
  const endISO = shanghaiDateToUtcISO(endDateStr, 1);
  return { startDateStr, endDateStr, startISO, endISO };
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
    const { startDateStr, endDateStr, startISO: rangeStart, endISO: rangeEnd } = getDateRange(range, customStart, customEnd);

    const supabase = getSupabaseClient();

    const { data: teams } = await supabase
      .from('teams')
      .select('id, team_name, team_code')
      .order('team_name');

    if (!teams || teams.length === 0) {
      return NextResponse.json({ success: true, data: { teams: [], date_range: { start: startDateStr, end: endDateStr } } });
    }

    const teamIds = teams.map(t => t.id);

    // 只统计当前有效员工：is_deleted=false、status<>'deleted'、deleted_at IS NULL、role=employee
    // 已删除员工的历史客户仍保留在 customers 表，但不计入当前团队/员工统计。
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, name, team_id, avatar_url, role, status')
      .eq('role', 'employee')
      .eq('is_deleted', false)
      .neq('status', 'deleted')
      .is('deleted_at', null);

    // 客户查询不能强制要求 team_id 在 teamIds 中，
    // 因为历史客户可能 team_id 为 NULL/0 或关联到被删除的团队
    const { data: rangeCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level, created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd);

    const { data: allCustomers } = await supabase
      .from('customers')
      .select('employee_id, team_id, customer_level');

    const { data: rangeTransitions } = await supabase
      .from('customer_level_logs')
      .select('employee_id, team_id, from_level, to_level, created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd);

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

    // 只统计当前有效员工：employees 已过滤 is_deleted=false / status<>'deleted' / deleted_at IS NULL
    // 已离职员工的客户保留在 customers 表中，但不计入当前团队/员工统计
    const activeEmployeeIds = new Set<number>((employees || []).map(e => e.id));
    const activeEmployeeTeamMap = new Map<number, number | null>();
    for (const e of employees || []) {
      activeEmployeeTeamMap.set(e.id, e.team_id);
    }

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
      // 只统计当前有效员工的客户
      if (!activeEmployeeIds.has(c.employee_id)) continue;
      // 团队归属以员工当前 team_id 为准；仅在该员工确实属于该团队时计入团队统计
      const empTeamId = activeEmployeeTeamMap.get(c.employee_id);
      if (empTeamId == null || !teamIds.includes(empTeamId)) continue;
      teamTodayMap[empTeamId] = (teamTodayMap[empTeamId] || 0) + 1;
      empTodayMap[c.employee_id] = (empTodayMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as keyof Levels;
      const teamTodayLevels = teamTodayLevelMap[empTeamId] ?? emptyLevels();
      const empTodayLevels = empTodayLevelMap[c.employee_id] ?? emptyLevels();
      teamTodayLevels[level] += 1;
      empTodayLevels[level] += 1;
      teamTodayLevelMap[empTeamId] = teamTodayLevels;
      empTodayLevelMap[c.employee_id] = empTodayLevels;
    }

    for (const c of allCustomers || []) {
      if (!activeEmployeeIds.has(c.employee_id)) continue;
      const empTeamId = activeEmployeeTeamMap.get(c.employee_id);
      if (empTeamId == null || !teamIds.includes(empTeamId)) continue;
      teamTotalMap[empTeamId] = (teamTotalMap[empTeamId] || 0) + 1;
      empTotalMap[c.employee_id] = (empTotalMap[c.employee_id] || 0) + 1;
      const level = (c.customer_level || 'A') as keyof Levels;
      const teamLevels = teamLevelMap[empTeamId] ?? emptyLevels();
      const empLevels = empLevelMap[c.employee_id] ?? emptyLevels();
      teamLevels[level] += 1;
      empLevels[level] += 1;
      teamLevelMap[empTeamId] = teamLevels;
      empLevelMap[c.employee_id] = empLevels;
    }

    const totalTransitions = emptyTransitions();
    for (const log of rangeTransitions || []) {
      // 仅统计当前有效员工的等级变化日志
      if (!activeEmployeeIds.has(log.employee_id)) continue;
      const key = `${log.from_level}_to_${log.to_level}` as keyof Transitions;
      if (key in totalTransitions) {
        totalTransitions[key] += 1;
        const empTeamId = activeEmployeeTeamMap.get(log.employee_id);
        if (empTeamId != null && teamIds.includes(empTeamId)) {
          const teamTransitions = teamTransitionMap[empTeamId] ?? emptyTransitions();
          teamTransitions[key] += 1;
          teamTransitionMap[empTeamId] = teamTransitions;
        }
        const empTransitions = empTransitionMap[log.employee_id] ?? emptyTransitions();
        empTransitions[key] += 1;
        empTransitionMap[log.employee_id] = empTransitions;
      }
    }

    const teamStats = teams.map(t => {
      // 只展示当前属于该团队的在职员工；已离职员工即使在该团队有历史客户，
      // 也不出现在当前员工列表（其历史客户保留在 customers 表，可在「历史数据」中查看）
      const teamEmployees = (employees || [])
        .filter(e => e.team_id === t.id)
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          avatar_url: emp.avatar_url || null,
          today_customers: empTodayMap[emp.id] || 0,
          total_customers: empTotalMap[emp.id] || 0,
          level_stats: empLevelMap[emp.id] || emptyLevels(),
          today_level_stats: empTodayLevelMap[emp.id] || emptyLevels(),
          transitions: empTransitionMap[emp.id] || emptyTransitions(),
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
        date_range: { start: startDateStr, end: endDateStr },
      },
    });
  } catch (err) {
    console.error('获取管理员统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
