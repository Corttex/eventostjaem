import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { ticketId, toggle } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId é obrigatório' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ingresso não encontrado' }, { status: 404 });
    }

    const newScannedState = toggle ? !ticket.scanned : true;

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        scanned: newScannedState,
        scannedAt: newScannedState ? new Date() : null
      }
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updated.id,
        scanned: updated.scanned,
        scannedAt: updated.scannedAt
      }
    });

  } catch (error: any) {
    console.error('Manual checkin error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar check-in', details: error.message }, { status: 500 });
  }
}
