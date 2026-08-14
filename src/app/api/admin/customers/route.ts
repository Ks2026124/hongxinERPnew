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

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('customers')
      .select(`
        *,
        employee:profiles!customers_employee_id_profiles_id_fk(id, name, username),
        team:teams!customers_team_id_teams_id_fk(id, team_name, team_code)
      `)
      .order('created_at', { ascending: false });

    if (teamId && teamId !== 'all') {
      query = query.eq('team_id', parseInt(teamId));
    }
    if (employeeId && employeeId !== 'all') {
      query = query.eq('employee_id', parseInt(employeeId));
    }
    if (startDate) {
      // 直接使用带时区的字符串，避免 toISOString() 转换为 UTC 导致日期偏移
      query = query.gte('created_at', `${startDate}T00:00:00+08:00`);
    }
    if (endDate) {
      // 结束日期 +1 天，使用 < 半开区间，确保包含结束日期当天全部时间
      const end = new Date(`${endDate}T00:00:00+08:00`);
      end.setDate(end.getDate() + 1);
      // 格式化为 YYYY-MM-DDTHH:mm:ss+08:00
      const endDateStr = end.toISOString().split('T')[0];
      query = query.lt('created_at', `${endDateStr}T00:00:00+08:00`);
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
