import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/admin/customers/[id] - 管理员查看客户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
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
      .select(`
        *,
        employee:profiles!customers_employee_id_profiles_id_fk(id, name, username),
        team:teams!customers_team_id_teams_id_fk(id, team_name, team_code)
      `)
      .eq('id', customerId)
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

// PATCH /api/admin/customers/[id] - 管理员修改客户
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const body = await request.json();
    const { customer_name, phone, wechat_id, remark, employee_id, team_id } = body;

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: '客户姓名不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    const updateData: Record<string, unknown> = {
      customer_name: customer_name.trim(),
      phone: phone?.trim() || null,
      wechat_id: wechat_id?.trim() || null,
      remark: remark?.trim() || null,
    };

    if (employee_id !== undefined) {
      updateData.employee_id = parseInt(employee_id);
    }
    if (team_id !== undefined) {
      updateData.team_id = parseInt(team_id);
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
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

// DELETE /api/admin/customers/[id] - 管理员删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户 ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

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
