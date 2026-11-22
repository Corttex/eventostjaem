import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createStaffToken, setStaffSessionCookie, StaffRole } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const requiredRole = body.requiredRole === 'ADMIN' ? 'ADMIN' : 'SCANNER';

    if (!email.trim() || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const isPasswordValid =
      Boolean(user?.password) && (await bcrypt.compare(password, user!.password));

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401 }
      );
    }

    const hasPermission =
      requiredRole === 'ADMIN'
        ? user.role === 'ADMIN'
        : user.role === 'ADMIN' || user.role === 'SCANNER';

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Usuário sem permissão para acessar esta área.' },
        { status: 403 }
      );
    }

    const role = user.role as StaffRole;
    let token: string;
    try {
      token = await createStaffToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role,
      });
    } catch (err: any) {
      if (err?.message?.includes('JWT_SECRET')) {
        return NextResponse.json(
          { error: 'JWT_SECRET não configurado no servidor.' },
          { status: 500 }
        );
      }
      throw err;
    }

    await setStaffSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (error: any) {
    console.error('Staff Login Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao realizar login.' },
      { status: 500 }
    );
  }
}
