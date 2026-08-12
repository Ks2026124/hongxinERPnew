import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionFromCookie } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
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
      return NextResponse.json({ error: '无效的员工 ID' }, { status: 400 });
    }

    // 不能删除管理员
    if (employeeId === session.userId) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 查询目标员工
    const { data: employee, error: queryError } = await client
      .from('profiles')
      .select('id, username, name, role, is_deleted')
      .eq('id', employeeId)
      .single();

    if (queryError || !employee) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    if (employee.role === 'admin') {
      return NextResponse.json({ error: '不能删除管理员账号' }, { status: 400 });
    }

    // 软删除：设置 is_deleted = true, deleted_at = now, status = 'deleted'
    const { error: updateError } = await client
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: 'deleted',
      })
      .eq('id', employeeId);

    if (updateError) {
      return NextResponse.json(
        { error: `删除失败: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: employeeId, username: employee.username, name: employee.name },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除员工失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
