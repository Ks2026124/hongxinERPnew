import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
      return NextResponse.json({ error: 'Supabase URL 未配置' }, { status: 500 });
    }

    // 优先使用 service role key（绕过 RLS），回退到 anon key
    const key = serviceKey ?? anonKey;
    if (!key) {
      return NextResponse.json({ error: 'Supabase Key 未配置' }, { status: 500 });
    }

    const client = createClient(url, key);

    const { data: teams, error } = await client
      .from('teams')
      .select('id, team_code, team_name')
      .order('team_name');

    if (error) {
      console.error('[teams API] Supabase 查询错误:', error.message);
      return NextResponse.json({ error: `查询团队失败: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: teams || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败';
    console.error('[teams API] 异常:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
