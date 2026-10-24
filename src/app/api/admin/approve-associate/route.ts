import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { ticketId, approved } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId é obrigatório' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        associateApproved: Boolean(approved)
      }
    });

    return NextResponse.json({
      success: true,
      ticketId: updated.id,
      associateApproved: updated.associateApproved
    });
  } catch (error: any) {
    console.error('Erro ao aprovar carteirinha:', error);
    return NextResponse.json({ error: 'Erro interno ao aprovar', details: error.message }, { status: 500 });
  }
}
