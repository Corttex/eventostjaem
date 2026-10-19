import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalTickets = tickets.length;
    const paidTickets = tickets.filter(t => t.status === 'PAID');
    const pendingTickets = tickets.filter(t => t.status === 'PENDING');
    const checkedInTickets = tickets.filter(t => t.scanned);

    const totalRevenue = paidTickets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingRevenue = pendingTickets.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return NextResponse.json({
      tickets,
      summary: {
        totalTickets,
        paidCount: paidTickets.length,
        pendingCount: pendingTickets.length,
        checkedInCount: checkedInTickets.length,
        totalRevenue,
        pendingRevenue
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 });
  }
}
