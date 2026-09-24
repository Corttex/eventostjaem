import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { cpf, password } = await req.json();

    if (!cpf || !password) {
      return NextResponse.json({ error: 'CPF e Senha são obrigatórios' }, { status: 400 });
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { cpf: cleanCpf },
          { cpf: cpf }
        ]
      },
      include: { tickets: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    if (!user.tickets || user.tickets.length === 0) {
      return NextResponse.json({ error: 'Nenhum ingresso encontrado.' }, { status: 404 });
    }

    // Retorna o ID do primeiro ingresso comprado
    return NextResponse.json({ success: true, ticketId: user.tickets[0].id });

  } catch (error: any) {
    console.error('Auth Ticket Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor', details: error.message }, { status: 500 });
  }
}
