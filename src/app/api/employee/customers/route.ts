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

// POST /api/employee/customers - 员工新增客户（必须先通过微信截图验证）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'employee') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '请求数据格式错误' }, { status: 400 });
    }
    const { customer_name, phone, wechat_id, remark, verification_id } = body as {
      customer_name?: string;
      phone?: string;
      wechat_id?: string;
      remark?: string;
      verification_id?: number;
    };

    if (!customer_name || !customer_name.trim()) {
      return NextResponse.json({ error: '客户姓名不能为空' }, { status: 400 });
    }

    // === 强制微信截图验证 ===
    if (!verification_id) {
      return NextResponse.json(
        { success: false, error: 'WECHAT_IMAGE_VERIFICATION_REQUIRED' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();

    // 验证记录必须属于当前员工、状态为 verified、且未被使用
    const { data: verification, error: verifyError } = await supabase
      .from('wechat_verifications')
      .select('id, employee_id, status, image_url, sha256, phash')
      .eq('id', verification_id)
      .eq('employee_id', user.userId)
      .eq('status', 'verified')
      .is('customer_id', null)
      .maybeSingle();

    if (verifyError || !verification) {
      return NextResponse.json(
        { success: false, error: 'WECHAT_IMAGE_VERIFICATION_REQUIRED' },
        { status: 403 }
      );
    }

    // 创建客户
    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone?.trim() || null,
        wechat_id: wechat_id?.trim() || null,
        remark: remark?.trim() || null,
        employee_id: user.userId,
        team_id: user.teamId,
        customer_level: 'A', // 新客户默认为 A 类
      })
      .select()
      .single();

    if (error) {
      console.error('新增客户失败:', error);
      return NextResponse.json({ error: '新增客户失败' }, { status: 500 });
    }

    // 记录等级变化日志（新建客户，从 null 到 A）
    await supabase.from('customer_level_logs').insert({
      customer_id: data.id,
      employee_id: user.userId,
      from_level: null,
      to_level: 'A',
      remark: '新建客户',
    });

    // 标记验证记录为已使用，并关联客户
    await supabase
      .from('wechat_verifications')
      .update({ status: 'used', used_at: new Date().toISOString(), customer_id: data.id })
      .eq('id', verification.id);

    // 将验证图片也记录到 customer_images 表（关联到新客户）
    await supabase.from('customer_images').insert({
      customer_id: data.id,
      employee_id: user.userId,
      team_id: user.teamId,
      image_url: verification.image_url,
      sha256: verification.sha256,
      phash: verification.phash,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('新增客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
