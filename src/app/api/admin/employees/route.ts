import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    const client = getSupabaseClient();

    let query = client
      .from('profiles')
      .select('id, username, name, phone, role, team_id, status, is_deleted, deleted_at, created_at, teams(team_name)')
      .eq('role', 'employee')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (teamId && teamId !== 'all') {
      query = query.eq('team_id', parseInt(teamId));
    }

    const { data: employees, error } = await query;

    if (error) throw new Error(`查询员工列表失败: ${error.message}`);

    return NextResponse.json({ data: employees || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
