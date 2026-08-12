import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  hashPassword,
  validateUsername,
  validatePassword,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, password, confirm_password, team_id } = body as {
      name: string;
      username: string;
      password: string;
      confirm_password: string;
      team_id: number;
    };

    // Validate required fields
    if (!name || !username || !password || !confirm_password || !team_id) {
      return NextResponse.json(
        { error: '请填写所有必填项' },
        { status: 400 }
      );
    }

    // Validate username
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return NextResponse.json({ error: usernameCheck.message }, { status: 400 });
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
    }

    // Check password match
    if (password !== confirm_password) {
      return NextResponse.json(
        { error: '两次输入的密码不一致' },
        { status: 400 }
      );
    }

    // Validate name
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: '姓名必须为2-50个字符' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Check if team exists
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id')
      .eq('id', team_id)
      .maybeSingle();

    if (teamError) throw new Error(`查询团队失败: ${teamError.message}`);
    if (!team) {
      return NextResponse.json({ error: '所选团队不存在' }, { status: 400 });
    }

    // Check if username already exists
    const { data: existing, error: checkError } = await client
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) throw new Error(`查询失败: ${checkError.message}`);
    if (existing) {
      return NextResponse.json(
        { error: '用户名已被使用' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create profile
    const { data: profile, error: insertError } = await client
      .from('profiles')
      .insert({
        username,
        password_hash: passwordHash,
        name,
        role: 'employee',
        team_id,
        status: 'pending',
      })
      .select('id, username, name, role, status')
      .single();

    if (insertError) throw new Error(`注册失败: ${insertError.message}`);

    return NextResponse.json({
      success: true,
      data: profile,
      message: '注册成功，请等待管理员审核',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '注册失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
