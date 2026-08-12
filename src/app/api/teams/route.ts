import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();

    const { data: teams, error } = await client
      .from('teams')
      .select('id, team_code, team_name')
      .order('team_name');

    if (error) throw new Error(`查询团队失败: ${error.message}`);

    return NextResponse.json({ data: teams || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
