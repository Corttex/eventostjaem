import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { cpf } = await req.json();

    if (!cpf) {
      return NextResponse.json({ exists: false, error: 'CPF não informado' }, { status: 400 });
    }

    const rawCpf = (cpf || '').trim();
    const cleanCpf = rawCpf.replace(/\D/g, '');
    let formattedCpf = cleanCpf;
    if (cleanCpf.length === 11) {
      formattedCpf = `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { cpf: cleanCpf },
          { cpf: formattedCpf },
          { cpf: rawCpf }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true
      }
    });

    if (user) {
      return NextResponse.json({
        exists: true,
        user: {
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          phone: user.phone
        }
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error('Erro ao verificar CPF:', error);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
