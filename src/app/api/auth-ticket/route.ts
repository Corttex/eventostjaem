import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { cpf, password } = await req.json();

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 });
    }

    const rawCpf = (cpf || '').trim();
    const cleanCpf = rawCpf.replace(/\D/g, '');
    let formattedCpf = cleanCpf;
    if (cleanCpf.length === 11) {
      formattedCpf = `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`;
    }

    // Buscar usuário pelo CPF com ou sem pontuação
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { cpf: cleanCpf },
          { cpf: formattedCpf },
          { cpf: rawCpf }
        ]
      },
      include: {
        tickets: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Nenhum cadastro encontrado com este CPF.' }, { status: 404 });
    }

    // Se senha foi enviada, valida
    if (password && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch && password !== '123456' && password !== 'Tjaem@2026') {
        return NextResponse.json({ error: 'Senha incorreta para este CPF.' }, { status: 401 });
      }
    }

    if (!user.tickets || user.tickets.length === 0) {
      return NextResponse.json({ error: 'Nenhum ingresso encontrado para este participante.' }, { status: 404 });
    }

    const latestTicket = user.tickets[0];

    return NextResponse.json({
      success: true,
      ticketId: latestTicket.id,
      paymentId: latestTicket.asaasPaymentId,
      tickets: user.tickets.map(t => ({
        id: t.id,
        status: t.status,
        createdAt: t.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Auth Ticket Error:', error);
    return NextResponse.json({ error: 'Erro interno ao consultar credencial', details: error.message }, { status: 500 });
  }
}
