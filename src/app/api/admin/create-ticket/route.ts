import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireStaffSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = await requireStaffSession(['ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { name, email, cpf, phone, ticketType, hasKit, hasBuffet, amount, paymentMethod } = await req.json();

    if (!name || !email || !cpf) {
      return NextResponse.json({ error: 'Nome, Email e CPF são obrigatórios' }, { status: 400 });
    }

    // 1. Verificar se usuário já existe
    const cleanCpf = cpf.replace(/\D/g, '');
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { cpf: cleanCpf }]
      }
    });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: { name, email, cpf: cleanCpf, phone: phone || '0000000000', password: hashedPassword }
      });
    }

    // Monta o tipo de credencial
    let finalType = ticketType || 'INGRESSO_UNICO';
    const extras: string[] = [];
    if (hasKit) extras.push('KIT 30 ANOS');
    if (hasBuffet) extras.push('ALMOÇO BUFFET');
    if (extras.length > 0 && !finalType.includes('+')) {
      finalType += ' + ' + extras.join(' + ');
    }

    // 2. Salvar o Ticket Direto no Banco (Cortesia / Manual)
    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        status: 'PAID', // Já nasce como pago/confirmado
        paymentMethod: paymentMethod || 'CORTESIA_MANUAL',
        amount: Number(amount) || 0.00,
        ticketType: finalType
      }
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });

  } catch (error) {
    console.error('Create Ticket Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
