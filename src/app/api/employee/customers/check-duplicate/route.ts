import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type DuplicatePayload = {
  wechat_id?: string;
  wechat?: string;
  phone?: string;
};

type CustomerRow = {
  id: number;
  customer_name: string;
  phone: string | null;
  wechat_id: string | null;
  customer_level: string | null;
  created_at: string;
  employee_id: number;
  team_id: number;
};

type ProfileRow = { id: number; name: string | null; username: string | null };
type TeamRow = { id: number; team_name: string; team_code: string | null };

async function runCheck(payload: DuplicatePayload) {
  const wechatId = (payload.wechat_id || payload.wechat || '').trim();
  const phone = (payload.phone || '').trim();

  if (!wechatId && !phone) {
    return NextResponse.json(
      { error: '请提供微信号或手机号' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();

  const orClauses: string[] = [];
  if (wechatId) orClauses.push(`wechat_id.eq.${wechatId}`);
  if (phone) orClauses.push(`phone.eq.${phone}`);

  // 第一步：只查 customers 表单表（不使用任何外键 embed，避免 PGRST200）
  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, customer_name, phone, wechat_id, customer_level, created_at, employee_id, team_id'
    )
    .or(orClauses.join(','))
    .limit(1);

  if (error) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] customers 查询失败:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { exists: false, customer: null, checkError: true },
      { status: 200 }
    );
  }

  const row = (data && data[0]) as CustomerRow | undefined;
  if (!row) {
    return NextResponse.json({ exists: false, customer: null });
  }

  // 第二步：单独查询员工姓名和团队名称（避免 PostgREST embed 关系问题）
  let employeeName = '未知';
  let teamName = '未知';
  let teamCode = '';

  const [{ data: emp, error: empErr }, { data: team, error: teamErr }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, username')
        .eq('id', row.employee_id)
        .maybeSingle<ProfileRow | null>(),
      supabase
        .from('teams')
        .select('id, team_name, team_code')
        .eq('id', row.team_id)
        .maybeSingle<TeamRow | null>(),
    ]);

  if (empErr) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] profiles 查询失败:', {
      code: empErr.code,
      message: empErr.message,
    });
  }
  if (teamErr) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] teams 查询失败:', {
      code: teamErr.code,
      message: teamErr.message,
    });
  }

  if (emp) {
    employeeName = emp.name || emp.username || '未知';
  }
  if (team) {
    teamName = team.team_name || '未知';
    teamCode = team.team_code || '';
  }

  return NextResponse.json({
    exists: true,
    customer: {
      id: row.id,
      customer_name: row.customer_name,
      phone: row.phone,
      wechat_id: row.wechat_id,
      customer_level: row.customer_level,
      created_at: row.created_at,
      employee_name: employeeName,
      team_name: teamName,
      team_code: teamCode,
    },
  });
}

export async function POST(req: Request) {
  try {
    let payload: DuplicatePayload = {};
    try {
      payload = (await req.json()) as DuplicatePayload;
    } catch {
      payload = {};
    }
    return await runCheck(payload);
  } catch (err) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] POST 服务器错误:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return await runCheck({
      wechat_id: url.searchParams.get('wechat_id') || '',
      phone: url.searchParams.get('phone') || '',
    });
  } catch (err) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] GET 服务器错误:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
