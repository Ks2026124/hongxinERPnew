import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: '未登录' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    status: user.status,
  });
}
