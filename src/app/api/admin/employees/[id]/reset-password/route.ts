import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure at least one uppercase, one lowercase, one digit
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const arr = password.split('');
  arr[0] = upper[Math.floor(Math.random() * upper.length)];
  arr[1] = lower[Math.floor(Math.random() * lower.length)];
  arr[2] = digits[Math.floor(Math.random() * digits.length)];
  // Shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const employeeId = parseInt(id);
    if (isNaN(employeeId)) {
      return NextResponse.json({ error: '无效的员工ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get the target employee
    const { data: target, error: fetchError } = await supabase
      .from('profiles')
      .select('id, name, username, role')
      .eq('id', employeeId)
      .limit(1)
      .single();

    if (fetchError || !target) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    // Cannot reset admin password
    if (target.role === 'admin') {
      return NextResponse.json({ error: '不能重置管理员密码' }, { status: 403 });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Update password and set must_change_password
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password_hash: passwordHash,
        must_change_password: true,
        updated_at: new Date(),
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Reset password error:', updateError);
      return NextResponse.json({ error: '重置密码失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        employee_id: employeeId,
        employee_name: target.name,
        username: target.username,
        temp_password: tempPassword,
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
