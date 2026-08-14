import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// 一次性迁移端点：在 Vercel 生产环境给 customers 表补 customer_level 字段
// 访问方式（部署后用一次，然后建议删除或保留但加保护）：
//   GET  /api/debug/migrate-customer-level?token=<MIGRATE_SECRET>
//
// 安全：必须带 token，token 取自环境变量 MIGRATE_SECRET（未设置则默认拒绝）。
//
// 注意：此端点通过 Supabase RPC 执行 SQL，要求数据库中存在 exec_sql(text) 函数；
//      若不存在会返回指引，让你在火山引擎 Supabase 控制台 SQL Editor 跑同一份 SQL
//      （脚本位于 scripts/migrate-customer-level.sql）。

const MIGRATE_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customers' AND column_name='customer_level'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN customer_level varchar(1) DEFAULT 'A';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.customers'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%customer_level%'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_customer_level_check
      CHECK (customer_level IN ('A','B','C','D'));
  END IF;
END $$;

UPDATE public.customers SET customer_level='A' WHERE customer_level IS NULL;

NOTIFY pgrst, 'reload schema';
`;

async function rpc(sql: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: 'missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' };
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
    cache: 'no-store',
  });
  const text = await r.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: r.status, body };
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'MIGRATE_SECRET 未设置，拒绝执行。请在 Vercel 环境变量中添加 MIGRATE_SECRET=<随机字符串> 后重新部署，再带 ?token=<该值> 访问。' },
      { status: 403 }
    );
  }
  if (token !== secret) {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 403 });
  }

  // 先尝试 RPC 执行
  const result = await rpc(MIGRATE_SQL);

  // 无论 RPC 成功与否，再走一次 PostgREST OpenAPI 校验 schema cache
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  await new Promise(r => setTimeout(r, 2000));
  const openApiRes = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
  });
  const openApi = await openApiRes.json() as { definitions?: { customers?: { properties?: Record<string, unknown> } } };
  const cachedFields = openApi.definitions?.customers?.properties
    ? Object.keys(openApi.definitions.customers.properties)
    : null;

  // 校验数据
  const sampleRes = await fetch(
    `${url.replace(/\/$/, '')}/rest/v1/customers?select=id,customer_name,customer_level&order=id.desc&limit=5`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const sample = await sampleRes.json();

  return NextResponse.json({
    ok: !(result as { error?: string }).error,
    migration_rpc: result,
    postgrest_schema_cache: {
      customers_cached_fields: cachedFields,
      customer_level_in_cache: !!cachedFields && cachedFields.includes('customer_level'),
    },
    sample_rows: sample,
    note: '若 migration_rpc 返回 PGRST202（找不到 exec_sql 函数），说明该 Supabase 实例未开放 SQL RPC。请到控制台 SQL Editor 执行 scripts/migrate-customer-level.sql 中的 SQL，然后重新访问本接口确认 cache。',
  });
}
