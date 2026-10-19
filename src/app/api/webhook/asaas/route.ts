import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[ASAAS WEBHOOK EVENT]:', body.event, body.payment?.id);

    const event = body.event;
    const payment = body.payment;

    if (!payment || !payment.id) {
      return NextResponse.json({ received: true, ignored: true });
    }

    // Se o pagamento for confirmado ou recebido
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event)) {
      await prisma.ticket.updateMany({
        where: { asaasPaymentId: payment.id },
        data: { 
          status: 'PAID',
          paymentMethod: payment.billingType || undefined
        }
      });
      console.log(`[ASAAS WEBHOOK] Tickets atualizados para PAID para paymentId: ${payment.id}`);
    } else if (['PAYMENT_OVERDUE', 'PAYMENT_DELETED'].includes(event)) {
      await prisma.ticket.updateMany({
        where: { asaasPaymentId: payment.id },
        data: { status: 'CANCELLED' }
      });
    }

    return NextResponse.json({ success: true, processedEvent: event });
  } catch (error: any) {
    console.error('[ASAAS WEBHOOK ERROR]:', error);
    return NextResponse.json({ error: 'Erro processando webhook' }, { status: 500 });
  }
}
