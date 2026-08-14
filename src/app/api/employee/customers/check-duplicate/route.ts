import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionFromCookie } from '@/lib/auth';

/**
 * 客户查重 API
 * 
 * 根据微信号或手机号查询客户是否已存在
 * 
 * GET /api/employee/customers/check-duplicate?wechat_id=xxx&phone=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookie();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wechatId = searchParams.get('wechat_id');
    const phone = searchParams.get('phone');

    // 至少需要一个查询参数
    if (!wechatId && !phone) {
      return NextResponse.json({ error: '请提供微信号或手机号' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    // 构建查询条件
    let query = supabase
      .from('customers')
      .select(`
        id,
        customer_name,
        phone,
        wechat_id,
        customer_level,
        created_at,
        employee_id,
        team_id,
        employee:profiles!customers_employee_id_fkey(id, name, username),
        team:teams!customers_team_id_fkey(id, team_name, team_code)
      `);

    // 根据微信号或手机号查询
    if (wechatId) {
      query = query.eq('wechat_id', wechatId.trim());
    } else if (phone) {
      query = query.eq('phone', phone.trim());
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('[CUSTOMER_CHECK_DUPLICATE] 查询失败:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 如果找到匹配的客户
    if (data && data.length > 0) {
      const customer = data[0];
      // Supabase 关联查询可能返回数组或对象
      const employee = Array.isArray(customer.employee) ? customer.employee[0] : customer.employee;
      const team = Array.isArray(customer.team) ? customer.team[0] : customer.team;
      
      return NextResponse.json({
        exists: true,
        customer: {
          id: customer.id,
          customer_name: customer.customer_name,
          phone: customer.phone,
          wechat_id: customer.wechat_id,
          customer_level: customer.customer_level,
          created_at: customer.created_at,
          employee_name: employee?.name || employee?.username || '未知',
          team_name: team?.team_name || '未知',
          team_code: team?.team_code || '',
        }
      });
    }

    // 客户不存在
    return NextResponse.json({
      exists: false,
      customer: null
    });

  } catch (err) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] 服务器错误:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
