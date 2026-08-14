import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 临时诊断端点：确认线上连接到的 Supabase 项目与 customers 表结构
// 不暴露密钥，仅输出 host / 字段列表 / 样例值
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  try {
    const supabase = getSupabaseClient();

    const { data: cols, error: colErr } = await supabase
      .from('customers' as never)
      .select('*')
      .limit(1);

    // 通过 PostgREST OpenAPI 描述读取 schema cache
    const origin = url.replace(/\/$/, '');
    const openApiUrl = `${origin}/rest/v1/`;
    let openApi: unknown = null;
    let openApiErr: string | null = null;
    try {
      const r = await fetch(openApiUrl, {
        headers: {
          Accept: 'application/openapi+json',
          apikey: service,
          Authorization: `Bearer ${service}`,
        },
        cache: 'no-store',
      });
      const text = await r.text();
      openApiErr = `status=${r.status} len=${text.length} preview=${text.slice(0, 200)}`;
      try { openApi = JSON.parse(text); } catch { openApi = null; }
    } catch (e) {
      openApiErr = (e as Error).message;
    }

    const anyOpenApi = openApi as {
      definitions?: Record<string, { properties?: Record<string, unknown> }>;
      components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
    } | null;
    const customersDef =
      anyOpenApi?.definitions?.customers || anyOpenApi?.components?.schemas?.customers || null;
    const cachedFields = customersDef?.properties ? Object.keys(customersDef.properties) : null;

    const { data: sample, error: sampleErr } = await supabase
      .from('customers' as never)
      .select('id, customer_level, customer_name')
      .order('id', { ascending: false })
      .limit(3);

    return NextResponse.json({
      env: {
        supabase_url_host: (() => { try { return new URL(url).host; } catch { return url; } })(),
        anon_key_present: !!anon,
        anon_key_prefix: anon.slice(0, 16),
        service_key_present: !!service,
        service_key_prefix: service.slice(0, 16),
        node_env: process.env.NODE_ENV,
      },
      select_one: {
        error: colErr ? { code: colErr.code, message: colErr.message, hint: colErr.hint, details: colErr.details } : null,
        row_keys: cols && Array.isArray(cols) && cols[0] ? Object.keys(cols[0] as Record<string, unknown>) : null,
        customer_level_value: cols && Array.isArray(cols) && cols[0] ? (cols[0] as Record<string, unknown>).customer_level : null,
      },
      schema_cache: {
        fetch_error: openApiErr,
        customers_cached_fields: cachedFields,
        customer_level_in_cache: !!cachedFields && cachedFields.includes('customer_level'),
      },
      sample: {
        error: sampleErr ? { code: sampleErr.code, message: sampleErr.message } : null,
        rows: sample,
      },
    });
  } catch (e) {
    return NextResponse.json({ fatal: (e as Error).message, env_host: (() => { try { return new URL(url).host; } catch { return url; } })() }, { status: 500 });
  }
}
