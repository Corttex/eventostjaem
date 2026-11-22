import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const STAFF_SESSION_COOKIE = 'tjaem_staff_session';

export type StaffRole = 'ADMIN' | 'SCANNER';

export interface StaffSession {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET não configurado nas variáveis de ambiente.');
  }
  return new TextEncoder().encode(secret);
}

export async function createStaffToken(session: StaffSession): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getJwtSecret());
}

export async function verifyStaffToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      (payload.role !== 'ADMIN' && payload.role !== 'SCANNER')
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function setStaffSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function clearStaffSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyStaffToken(token);
}

export async function requireStaffSession(
  allowedRoles: StaffRole[]
): Promise<
  | { session: StaffSession; errorResponse?: never }
  | { session?: never; errorResponse: NextResponse }
> {
  const session = await getStaffSession();
  if (!session) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Não autenticado. Faça login novamente.' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Sem permissão para acessar esta área.' },
        { status: 403 }
      ),
    };
  }

  return { session };
}
