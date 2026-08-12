import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hongxin-erp-default-secret-key-change-in-production'
);
const SESSION_COOKIE_NAME = 'hongxin_session';

interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  teamId: number | null;
  name: string;
  status: string;
  mustChangePassword?: boolean;
}

async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  // Protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isEmployeeRoute = pathname.startsWith('/employee');
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // If accessing protected routes without session → redirect to login
  if ((isAdminRoute || isEmployeeRoute) && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated and accessing login/register → redirect to dashboard
  if (isAuthRoute && session) {
    const redirect = session.role === 'admin' ? '/admin' : '/employee';
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // If employee needs to change password, redirect to change-password page
  if (session && session.role === 'employee' && session.mustChangePassword) {
    if (!pathname.startsWith('/employee/change-password') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/employee/change-password', request.url));
    }
  }

  // If employee tries to access admin routes → redirect to employee
  if (isAdminRoute && session && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/employee', request.url));
  }

  // If admin tries to access employee routes → redirect to admin
  if (isEmployeeRoute && session && session.role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/employee/:path*',
    '/login',
    '/register',
  ],
};
