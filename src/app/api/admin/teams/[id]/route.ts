import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth';

// DELETE /api/admin/teams/[id] - 删除团队
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json({ error: '无效的团队ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查团队是否存在
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 });
    }

    // 检查团队是否有员工
    const { data: employees, error: countError } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);

    if (countError) throw countError;

    if (employees && employees.length > 0) {
      return NextResponse.json(
        { error: '该团队还有员工，无法删除' },
        { status: 400 }
      );
    }

    // 删除团队
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除团队失败:', error);
    return NextResponse.json({ error: '删除团队失败' }, { status: 500 });
  }
}
