import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

    // 使用数据库服务器时间获取今日日期
    const { data: nowData } = await supabase.rpc('now' as any).single();
    const serverNow = nowData ? new Date(nowData as string) : new Date();
    const todayStr = serverNow.toISOString().split('T')[0];
    
    // 本周一
    const today = new Date(serverNow);
    const dayOfWeek = today.getDay() || 7; // 周日为7
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    const weekStartStr = monday.toISOString().split('T')[0];

    // 1. 今日新增客户数
    const { count: todayCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

    // 2. 今日上传截图数
    const { count: todayImages } = await supabase
      .from('customer_images')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', user.userId)
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

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
      .gte('created_at', weekStartStr + 'T00:00:00');

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
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

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
      .gte('created_at', todayStr + 'T00:00:00')
      .lte('created_at', todayStr + 'T23:59:59');

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
      },
    });
  } catch (err) {
    console.error('获取员工统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
