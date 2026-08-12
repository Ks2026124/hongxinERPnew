import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SALT_ROUNDS = 10;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hongxin-erp-default-secret-key-change-in-production'
);
const SESSION_COOKIE_NAME = 'hongxin_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ============================================================
// Password Hashing
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// Session (JWT-based)
// ============================================================

export interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  teamId: number | null;
  name: string;
  status: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
  return token;
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COZE_PROJECT_ENV === 'PROD',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================================
// Validation
// ============================================================

export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (!username || username.length < 6 || username.length > 20) {
    return { valid: false, message: '用户名必须为6-20位' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return { valid: false, message: '用户名只允许数字和英文字母' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6 || password.length > 20) {
    return { valid: false, message: '密码必须为6-20位' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return { valid: false, message: '密码只允许数字和英文字母' };
  }
  return { valid: true };
}
