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

    // 5. 最近添加的客户（5个）
    const { data: recentCustomers } = await supabase
      .from('customers')
      .select('id, customer_name, phone, created_at')
      .eq('employee_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        today_customers: todayCustomers || 0,
        today_images: todayImages || 0,
        total_customers: totalCustomers || 0,
        week_customers: weekCustomers || 0,
        recent_customers: recentCustomers || [],
      },
    });
  } catch (err) {
    console.error('获取员工统计异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
