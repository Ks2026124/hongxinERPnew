import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT /api/employee/customers/[id]/level - 修改客户等级
export async function PUT(
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
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '请求数据格式错误' }, { status: 400 });
    }

    const { customer_level } = body as { customer_level?: string };

    if (!customer_level || !['A', 'B', 'C', 'D'].includes(customer_level)) {
      return NextResponse.json({ error: '无效的客户等级' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 获取当前客户信息
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('id, employee_id, customer_level')
      .eq('id', customerId)
      .eq('employee_id', user.userId) // 只能修改自己的客户
      .maybeSingle();

    if (fetchError) {
      console.error('获取客户信息失败:', fetchError);
      return NextResponse.json({ error: '获取客户信息失败' }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: '客户不存在或无权修改' }, { status: 404 });
    }

    const fromLevel = (customer.customer_level || 'A') as 'A' | 'B' | 'C' | 'D';

    // 如果等级没有变化，直接返回
    if (fromLevel === customer_level) {
      return NextResponse.json({ success: true, data: { id: customerId, customer_level } });
    }

    // 更新客户等级
    const { data, error: updateError } = await supabase
      .from('customers')
      .update({ customer_level })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      console.error('更新客户等级失败:', updateError);
      return NextResponse.json({ error: '更新客户等级失败' }, { status: 500 });
    }

    // 记录等级变化日志（支持正常流转 A→B→C→D 以及业务回退 B→A、C→B、D→C）
    const levelNames: Record<string, string> = {
      A: '新增客户',
      B: '深聊客户',
      C: '付费意向客户',
      D: '成交客户',
    };

    await supabase.from('customer_level_logs').insert({
      customer_id: customerId,
      employee_id: user.userId,
      from_level: fromLevel,
      to_level: customer_level,
      remark: `${fromLevel} → ${customer_level} (${levelNames[customer_level]})`,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('修改客户等级异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
