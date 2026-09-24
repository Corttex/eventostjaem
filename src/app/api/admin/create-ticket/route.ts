import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, cpf, phone } = await req.json();

    if (!name || !email || !cpf) {
      return NextResponse.json({ error: 'Nome, Email e CPF são obrigatórios' }, { status: 400 });
    }

    // 1. Verificar se usuário já existe
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash('123456', 10); // Senha padrão para cadastros manuais
      user = await prisma.user.create({
        data: { name, email, cpf, phone: phone || '0000000000', password: hashedPassword }
      });
    }

    // 2. Salvar o Ticket Direto no Banco (Cortesia / Manual)
    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        status: 'PAID', // Já nasce como pago/confirmado
        paymentMethod: 'CORTESIA_MANUAL',
        amount: 0.00
      }
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });

  } catch (error) {
    console.error('Create Ticket Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
