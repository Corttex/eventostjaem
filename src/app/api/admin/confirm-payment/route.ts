import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { ticketId, paymentId } = await req.json();

    if (!ticketId && !paymentId) {
      return NextResponse.json({ error: 'ticketId ou paymentId é obrigatório' }, { status: 400 });
    }

    if (paymentId) {
      await prisma.ticket.updateMany({
        where: { asaasPaymentId: paymentId },
        data: {
          status: 'PAID',
          paymentMethod: 'PIX'
        }
      });
    } else if (ticketId) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'PAID',
          paymentMethod: 'PIX'
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Pagamento confirmado manualmente pelo Administrador.' });
  } catch (error: any) {
    console.error('Confirm Payment Admin Error:', error);
    return NextResponse.json({ error: 'Erro ao aprovar pagamento manual', details: error.message }, { status: 500 });
  }
}

