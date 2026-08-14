import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getShanghaiDayRange } from '@/lib/date';

// 使用服务端 Supabase 客户端（绕过 RLS）
function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    // 从 cookie 获取当前用户
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const sessionToken = cookieStore.get('hongxin_session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 解析 JWT 获取用户信息
    const { jwtVerify } = await import('jose');
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || 'hongxin-erp-default-secret-key-change-in-production'
    );
    
    let user;
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
      user = payload as { userId: number; username: string; role: string; teamId: number | null; name: string };
    } catch {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // 获取当前用户信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, team_id')
      .eq('id', user.userId)
      .single();

    if (profileError || !profile) {
      console.error('[TEAM_PERFORMANCE] 获取用户信息失败:', profileError);
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
    }

    // 获取所有团队
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, team_name, team_code')
      .order('id');

    if (teamsError) {
      console.error('[TEAM_PERFORMANCE] 获取团队列表失败:', teamsError);
      return NextResponse.json({ error: '获取团队列表失败' }, { status: 500 });
    }

    // 统一使用 Asia/Shanghai 计算"今日"边界 [00:00, 次日00:00)
    const { startISO: todayStart, endISO: todayEnd } = getShanghaiDayRange();

    // 先查出各团队当前在职员工 id 集合，统计时只用这些 employee_id；
    // 已离职员工的历史客户保留在 customers 表，但不计入团队当前业绩。
    const teamActiveMembers = await Promise.all(
      teams.map(async (team) => {
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('team_id', team.id)
          .eq('role', 'employee')
          .neq('status', 'deleted')
          .is('deleted_at', null)
          .or('is_deleted.eq.false,is_deleted.is.null');

        if (membersError) {
          console.error(`[TEAM_PERFORMANCE] 获取团队 ${team.id} 成员失败:`, membersError);
        }
        return { team_id: team.id, member_ids: (members || []).map(m => m.id) };
      })
    );
    const memberIdMap = new Map(teamActiveMembers.map(m => [m.team_id, m.member_ids]));

    // 获取每个团队的统计数据
    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const memberIds = memberIdMap.get(team.id) || [];
        // 没有在职员工时直接返回 0，避免 in.() 空数组语义歧义
        if (memberIds.length === 0) {
          return {
            team_id: team.id,
            team_name: team.team_name,
            team_code: team.team_code,
            today_customers: 0,
            total_customers: 0,
          };
        }
        // 今日新增客户
        const { count: todayCount, error: todayError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .in('employee_id', memberIds)
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd);

        if (todayError) {
          console.error(`[TEAM_PERFORMANCE] 获取团队 ${team.id} 今日数据失败:`, todayError);
        }

        // 累计客户
        const { count: totalCount, error: totalError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .in('employee_id', memberIds);

        if (totalError) {
          console.error(`[TEAM_PERFORMANCE] 获取团队 ${team.id} 累计数据失败:`, totalError);
        }

        return {
          team_id: team.id,
          team_name: team.team_name,
          team_code: team.team_code,
          today_customers: todayCount || 0,
          total_customers: totalCount || 0,
        };
      })
    );

    // 排序：先按今日新增降序，再按累计客户降序
    teamStats.sort((a, b) => {
      if (b.today_customers !== a.today_customers) {
        return b.today_customers - a.today_customers;
      }
      return b.total_customers - a.total_customers;
    });

    // 添加排名
    const rankedStats = teamStats.map((stat, index) => ({
      ...stat,
      rank: index + 1,
    }));

    // 找到当前用户所属团队的排名
    const myTeamRank = rankedStats.find((stat) => stat.team_id === profile.team_id);

    return NextResponse.json({
      success: true,
      data: {
        my_team_id: profile.team_id,
        my_team_rank: myTeamRank,
        all_teams: rankedStats,
      },
    });
  } catch (error) {
    console.error('[TEAM_PERFORMANCE] 服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
