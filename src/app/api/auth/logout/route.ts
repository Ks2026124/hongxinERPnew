import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ success: true, message: '已退出登录' });
  } catch (err) {
    const message = err instanceof Error ? err.message : '退出失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
