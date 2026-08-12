import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/customers - 员工获取自己的客户列表
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
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('employee_id', user.userId)
      .order('created_at', { ascending: false });

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

// POST /api/employee/customers - 员工新增客户
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { customer_name, phone, wechat_id, remark } = body;

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: '客户姓名不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone?.trim() || null,
        wechat_id: wechat_id?.trim() || null,
        remark: remark?.trim() || null,
        employee_id: user.userId,
        team_id: user.teamId,
      })
      .select()
      .single();

    if (error) {
      console.error('新增客户失败:', error);
      return NextResponse.json({ error: '新增客户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('新增客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
