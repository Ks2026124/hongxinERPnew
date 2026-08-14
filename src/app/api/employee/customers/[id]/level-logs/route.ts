import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/employee/customers/[id]/level-logs - 获取客户等级变化记录
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json({ error: '无效的客户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 验证客户属于当前员工（或管理员）
    if (user.role === 'employee') {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('employee_id', user.userId)
        .maybeSingle();

      if (error || !customer) {
        return NextResponse.json({ error: '客户不存在或无权查看' }, { status: 404 });
      }
    }

    // 获取等级变化记录
    const { data, error } = await supabase
      .from('customer_level_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取等级变化记录失败:', error);
      return NextResponse.json({ error: '获取等级变化记录失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('获取等级变化记录异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
