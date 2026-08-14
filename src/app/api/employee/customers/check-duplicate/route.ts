import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type DuplicatePayload = {
  wechat_id?: string;
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
  employee?: { id: number; name: string; username: string } | { id: number; name: string; username: string }[] | null;
  team?: { id: number; team_name: string; team_code: string } | { id: number; team_name: string; team_code: string }[] | null;
};

function buildResponse(row: CustomerRow | null) {
  if (!row) {
    return NextResponse.json({ exists: false, customer: null });
  }
  const employee = Array.isArray(row.employee) ? row.employee[0] : row.employee;
  const team = Array.isArray(row.team) ? row.team[0] : row.team;
  return NextResponse.json({
    exists: true,
    customer: {
      id: row.id,
      customer_name: row.customer_name,
      phone: row.phone,
      wechat_id: row.wechat_id,
      customer_level: row.customer_level,
      created_at: row.created_at,
      employee_name: employee?.name || employee?.username || '未知',
      team_name: team?.team_name || '未知',
      team_code: team?.team_code || '',
    },
  });
}

async function runCheck(payload: DuplicatePayload) {
  const wechatId = (payload.wechat_id || '').trim();
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

  const { data, error } = await supabase
    .from('customers')
    .select(
      `id, customer_name, phone, wechat_id, customer_level, created_at, employee_id, team_id,
       employee:profiles!customers_employee_id_profiles_id_fk(id, name, username),
       team:teams!customers_team_id_teams_id_fk(id, team_name, team_code)`
    )
    .or(orClauses.join(','))
    .limit(1);

  if (error) {
    console.error('[CUSTOMER_CHECK_DUPLICATE] 查询失败:', {
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
  return buildResponse(row || null);
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
