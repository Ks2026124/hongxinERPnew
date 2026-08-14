import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/admin/customers - 管理员获取全部客户（含筛选）
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const customerLevel = searchParams.get('customer_level');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('customers')
      .select(`
        *,
        employee:profiles(id, name, username),
        team:teams(id, team_name, team_code)
      `)
      .order('created_at', { ascending: false });

    if (teamId && teamId !== 'all') {
      query = query.eq('team_id', parseInt(teamId));
    }
    if (employeeId && employeeId !== 'all') {
      query = query.eq('employee_id', parseInt(employeeId));
    }
    if (customerLevel && customerLevel !== 'all' && ['A', 'B', 'C', 'D'].includes(customerLevel)) {
      query = query.eq('customer_level', customerLevel);
    }
    if (startDate) {
      // 直接使用带时区的字符串，避免 toISOString() 转换为 UTC 导致日期偏移
      query = query.gte('created_at', `${startDate}T00:00:00+08:00`);
    }
    if (endDate) {
      // 结束日期 +1 天，使用 < 半开区间，确保包含结束日期当天全部时间。
      // 解析 +08:00 的北京时间 00:00 后加 1 天，避免再用 toISOString().split 取 UTC 日期
      // 导致"加一天"实际加在 UTC 日上、在凌晨时段错位。
      const [y, m, d] = endDate.split('-').map(Number);
      const endUtcMs = Date.UTC(y, m - 1, d + 1) - 8 * 3600 * 1000;
      const endISO = new Date(endUtcMs).toISOString();
      query = query.lt('created_at', endISO);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CUSTOMERS_API] Supabase 查询错误:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json({ 
        error: '获取客户列表失败',
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('[CUSTOMERS_API] 查询成功，返回', data?.length || 0, '条记录');
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('获取客户列表异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
