import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getShanghaiDayRange } from '@/lib/date';

// GET /api/employee/stats - 员工个人统计数据
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

    // 统一使用 Asia/Shanghai 的"今日"时间范围：
    // [上海当天 00:00, 上海次日 00:00)，转换成 UTC ISO 后与 created_at 比较。
    const { startISO: todayStartISO, endISO: todayEndISO } = getShanghaiDayRange();

    // 本周一（同样以北京时间为准）
    const now = new Date();
    const shanghaiParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const shYear = Number(shanghaiParts.find((p) => p.type === 'year')?.value);
    const shMonth = Number(shanghaiParts.find((p) => p.type === 'month')?.value);
    const shDay = Number(shanghaiParts.find((p) => p.type === 'day')?.value);
    // 构造一个对应"上海当天 00:00 +08:00"的 UTC Date
    const shanghaiTodayUtc = new Date(Date.UTC(shYear, shMonth - 1, shDay) - 8 * 3600 * 1000);
    const dow = shanghaiTodayUtc.getUTCDay() || 7;
    const shanghaiMondayUtc = new Date(shanghaiTodayUtc.getTime() - (dow - 1) * 86400000);
    const weekStartISO = shanghaiMondayUtc.toISOString();

    // 1. 今日新增客户数
    const { count: todayCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId)
      .gte('created_at', todayStartISO)
      .lt('created_at', todayEndISO);

    // 2. 今日上传截图数
    const { count: todayImages } = await supabase
      .from('customer_images')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId)
      .gte('created_at', todayStartISO)
      .lt('created_at', todayEndISO);

    // 3. 累计客户数
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId);

    // 4. 本周新增客户数
    const { count: weekCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId)
      .gte('created_at', weekStartISO);

    // 5. 最近添加的客户（5个，包含等级）
    const { data: recentCustomers } = await supabase
      .from('customers')
      .select('id, customer_name, phone, customer_level, created_at')
      .eq('employee_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 6. 客户等级统计（A/B/C/D 当前数量，NULL 兼容为 A）
    const { data: levelStats } = await supabase
      .from('customers')
      .select('customer_level')
      .eq('employee_id', user.userId);

    const levelCounts = { A: 0, B: 0, C: 0, D: 0 };
    if (levelStats) {
      levelStats.forEach((c: { customer_level: string | null }) => {
        const level = (c.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';
        if (level in levelCounts) {
          levelCounts[level]++;
        }
      });
    }

    // 7. 今日新增客户 A/B/C/D 统计（按创建时的等级，NULL 兼容为 A）
    const { data: todayLevelStats } = await supabase
      .from('customers')
      .select('customer_level')
      .eq('employee_id', user.userId)
      .gte('created_at', todayStartISO)
      .lt('created_at', todayEndISO);

    const todayNewLevels = { A: 0, B: 0, C: 0, D: 0 };
    if (todayLevelStats) {
      todayLevelStats.forEach((c: { customer_level: string | null }) => {
        const level = (c.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';
        if (level in todayNewLevels) {
          todayNewLevels[level]++;
        }
      });
    }

    // 8. 今日等级转化统计（从 customer_level_logs 表）
    const { data: todayChanges } = await supabase
      .from('customer_level_logs')
      .select('from_level, to_level')
      .eq('employee_id', user.userId)
      .gte('created_at', todayStartISO)
      .lt('created_at', todayEndISO);

    const transitions = {
      A_to_B: 0, B_to_C: 0, C_to_D: 0,
      A_to_C: 0, A_to_D: 0, B_to_D: 0,
    };
    if (todayChanges) {
      todayChanges.forEach((c: { from_level: string; to_level: string }) => {
        const key = `${c.from_level}_to_${c.to_level}` as keyof typeof transitions;
        if (key in transitions) {
          transitions[key]++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        today_customers: todayCustomers || 0,
        today_images: todayImages || 0,
        total_customers: totalCustomers || 0,
        week_customers: weekCustomers || 0,
        recent_customers: recentCustomers || [],
        level_counts: levelCounts,
        today_new_levels: todayNewLevels,
        transitions: transitions,
        today_transitions: transitions,
      },
    });
  } catch (err) {
    console.error('获取员工统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
