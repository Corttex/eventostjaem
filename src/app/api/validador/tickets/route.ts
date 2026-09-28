import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'ALL', 'PAID', 'PENDING', 'SCANNED'

    let whereClause: any = {};
    if (filter === 'PAID') whereClause.status = 'PAID';
    if (filter === 'PENDING') whereClause.status = 'PENDING';
    if (filter === 'SCANNED') whereClause.scanned = true;

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular estatísticas rápidas
    const allTickets = await prisma.ticket.findMany({
      select: { status: true, scanned: true }
    });

    const stats = {
      total: allTickets.length,
      paid: allTickets.filter(t => t.status === 'PAID').length,
      pending: allTickets.filter(t => t.status === 'PENDING').length,
      scanned: allTickets.filter(t => t.scanned).length
    };

    return NextResponse.json({
      success: true,
      stats,
      tickets: tickets.map(t => ({
        id: t.id,
        qrCodeToken: t.qrCodeToken,
        status: t.status,
        paymentMethod: t.paymentMethod,
        amount: t.amount,
        scanned: t.scanned,
        scannedAt: t.scannedAt,
        createdAt: t.createdAt,
        user: {
          name: t.user.name,
          email: t.user.email,
          cpf: t.user.cpf,
          phone: t.user.phone
        }
      }))
    });

  } catch (error: any) {
    console.error('Validador Tickets Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de ingressos', details: error.message }, { status: 500 });
  }
}
