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

    if (teamId) {
      query = query.eq('team_id', parseInt(teamId));
    }
    if (employeeId) {
      query = query.eq('employee_id', parseInt(employeeId));
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取客户列表失败:', error);
      return NextResponse.json({ error: '获取客户列表失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('获取客户列表异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
