import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/customers/[id] - 员工查看客户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('查看客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PATCH /api/employee/customers/[id] - 员工修改客户
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const body = await request.json();
    const { customer_name, phone, wechat_id, remark } = body;

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: '客户姓名不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // 验证客户属于当前员工
    const { data: existing, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: '客户不存在或无权修改' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('customers')
      .update({
        customer_name: customer_name.trim(),
        phone: phone?.trim() || null,
        wechat_id: wechat_id?.trim() || null,
        remark: remark?.trim() || null,
      })
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .select()
      .single();

    if (error) {
      console.error('修改客户失败:', error);
      return NextResponse.json({ error: '修改客户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('修改客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/employee/customers/[id] - 员工删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    // 验证客户属于当前员工
    const { data: existing, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('employee_id', user.userId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: '客户不存在或无权删除' }, { status: 404 });
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('employee_id', user.userId);

    if (error) {
      console.error('删除客户失败:', error);
      return NextResponse.json({ error: '删除客户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('删除客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
