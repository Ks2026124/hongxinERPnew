import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        teamId: session.teamId,
        name: session.name,
        status: session.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取用户信息失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
