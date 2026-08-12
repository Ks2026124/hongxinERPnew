import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth';

// PATCH /api/admin/employees/[id]/team - 修改员工所属团队
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = parseInt(id, 10);

    if (isNaN(employeeId)) {
      return NextResponse.json({ error: '无效的员工ID' }, { status: 400 });
    }

    const body = await request.json();
    const { team_id } = body;

    if (!team_id || isNaN(parseInt(team_id, 10))) {
      return NextResponse.json({ error: '请选择团队' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查员工是否存在
    const { data: employee, error: empError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    // 不能修改管理员的团队
    if (employee.role === 'admin') {
      return NextResponse.json({ error: '不能修改管理员的团队' }, { status: 400 });
    }

    // 检查团队是否存在
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', parseInt(team_id, 10))
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 });
    }

    // 更新员工团队
    const { data, error } = await supabase
      .from('profiles')
      .update({ team_id: parseInt(team_id, 10) })
      .eq('id', employeeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('修改员工团队失败:', error);
    return NextResponse.json({ error: '修改员工团队失败' }, { status: 500 });
  }
}
