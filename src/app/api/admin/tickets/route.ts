import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffSession } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireStaffSession(['ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            cpf: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const sanitizedTickets = tickets.map(t => ({
      ...t,
      user: {
        name: t.user.name,
        email: t.user.email,
        cpf: t.user.cpf,
        phone: t.user.phone
      }
    }));

    const totalTickets = sanitizedTickets.length;
    const paidTickets = sanitizedTickets.filter(t => t.status === 'PAID');
    const pendingTickets = sanitizedTickets.filter(t => t.status === 'PENDING');
    const checkedInTickets = sanitizedTickets.filter(t => t.scanned);

    const totalRevenue = paidTickets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pendingRevenue = pendingTickets.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return NextResponse.json({
      tickets: sanitizedTickets,
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
