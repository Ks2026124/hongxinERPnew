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

    // 检查团队是否有活跃员工（排除已删除的）
    const { data: activeEmployees, error: countError } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_deleted', false)
      .limit(1);

    if (countError) throw countError;

    if (activeEmployees && activeEmployees.length > 0) {
      return NextResponse.json(
        { error: '该团队还有在职员工，无法删除' },
        { status: 400 }
      );
    }

    // 清除已删除员工对该团队的引用（避免外键约束阻止删除）
    const { error: clearError } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('team_id', teamId);

    if (clearError) {
      console.warn('清除已删除员工的team_id失败（非致命）:', clearError.message);
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
