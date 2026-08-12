import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionFromCookie } from '@/lib/auth';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'rejected'],
  active: ['disabled'],
  disabled: ['active'],
  rejected: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = parseInt(id, 10);
    if (isNaN(employeeId)) {
      return NextResponse.json({ error: '无效的员工ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status: newStatus } = body as { status: string };

    if (!newStatus) {
      return NextResponse.json({ error: '请提供状态' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Get current employee status
    const { data: employee, error: findError } = await client
      .from('profiles')
      .select('id, status, role')
      .eq('id', employeeId)
      .maybeSingle();

    if (findError) throw new Error(`查询失败: ${findError.message}`);
    if (!employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    if (employee.role !== 'employee') {
      return NextResponse.json({ error: '不能修改管理员状态' }, { status: 400 });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[employee.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `不允许从 ${employee.status} 变更为 ${newStatus}` },
        { status: 400 }
      );
    }

    // Update status
    const { error: updateError } = await client
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (updateError) throw new Error(`更新失败: ${updateError.message}`);

    return NextResponse.json({
      success: true,
      data: { id: employeeId, status: newStatus },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
