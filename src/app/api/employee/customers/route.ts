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

    // 校验所属团队（team_id 为 NOT NULL，不能依赖 JWT 中的旧值）
    let teamId = user.teamId;
    if (!teamId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id, status, is_deleted')
        .eq('id', user.userId)
        .maybeSingle();
      if (profileError) {
        console.error('[CREATE_CUSTOMER_API] 获取员工团队失败:', profileError);
        return NextResponse.json({ error: '获取员工团队失败' }, { status: 500 });
      }
      if (!profile || profile.is_deleted) {
        return NextResponse.json({ error: '员工账号不存在或已删除' }, { status: 403 });
      }
      if (profile.status !== 'active') {
        return NextResponse.json({ error: '账号状态异常，无法新增客户' }, { status: 403 });
      }
      teamId = profile.team_id;
    }
    if (!teamId) {
      console.error('[CREATE_CUSTOMER_API] team_id 为空', { userId: user.userId });
      return NextResponse.json({ error: '当前员工未归属团队，无法新增客户' }, { status: 400 });
    }

    console.log('[CREATE_CUSTOMER_API] 创建客户', {
      employee_id: user.userId,
      team_id: teamId,
      customer_name: customer_name.trim(),
      wechat_id: wechat_id?.trim() || null,
      has_phone: Boolean(phone?.trim()),
      customer_level: 'A',
    });

    // 创建客户
    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_name: customer_name.trim(),
        phone: phone?.trim() || null,
        wechat_id: wechat_id?.trim() || null,
        remark: remark?.trim() || null,
        employee_id: user.userId,
        team_id: teamId,
        customer_level: 'A', // 新客户默认为 A 类
      })
      .select()
      .single();

    if (error) {
      console.error('[CREATE_CUSTOMER_API] Supabase insert 失败:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: '新增客户失败', detail: error.message, code: error.code },
        { status: 500 }
      );
    }

    // 记录等级变化日志（新建客户，从 null 到 A）。失败不影响主流程，但必须记录日志。
    const { error: logError } = await supabase.from('customer_level_logs').insert({
      customer_id: data.id,
      employee_id: user.userId,
      from_level: null,
      to_level: 'A',
      remark: '新建客户',
    });
    if (logError) {
      console.error('[CREATE_CUSTOMER_API] customer_level_logs 插入失败:', logError);
    }

    // 标记验证记录为已使用，并关联客户
    const { error: verificationUpdateError } = await supabase
      .from('wechat_verifications')
      .update({ status: 'used', used_at: new Date().toISOString(), customer_id: data.id })
      .eq('id', verification.id);
    if (verificationUpdateError) {
      console.error('[CREATE_CUSTOMER_API] 更新微信验证记录失败:', verificationUpdateError);
    }

    // 将验证图片也记录到 customer_images 表（关联到新客户）
    const { error: imageError } = await supabase.from('customer_images').insert({
      customer_id: data.id,
      employee_id: user.userId,
      team_id: teamId,
      image_url: verification.image_url,
      sha256: verification.sha256,
      phash: verification.phash,
    });
    if (imageError) {
      console.error('[CREATE_CUSTOMER_API] customer_images 插入失败:', imageError);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('新增客户异常:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
