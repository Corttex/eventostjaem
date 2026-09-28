import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');
    const ticketId = searchParams.get('ticketId');

    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasUrl = 'https://api.asaas.com/v3';

    let resolvedPaymentId = paymentId;

    if (!resolvedPaymentId && ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { user: true }
      });
      if (ticket) {
        if (!ticket.asaasPaymentId) {
          return NextResponse.json({
            paid: ticket.status === 'PAID',
            status: ticket.status,
            tickets: [{
              id: ticket.id,
              status: ticket.status,
              name: ticket.user.name,
              cpf: ticket.user.cpf,
              email: ticket.user.email
            }]
          });
        }
        resolvedPaymentId = ticket.asaasPaymentId;
      }
    }

    if (!resolvedPaymentId) {
      return NextResponse.json({ error: 'paymentId ou ticketId não informado' }, { status: 400 });
    }

    // Consulta na API do Asaas
    let paymentData: any = null;
    try {
      const asaasRes = await fetch(`${asaasUrl}/payments/${resolvedPaymentId}`, {
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey || ''
        },
        cache: 'no-store'
      });

      if (asaasRes.ok) {
        paymentData = await asaasRes.json();
      }
    } catch (asaasErr) {
      console.warn('Erro ao consultar Asaas em check-payment:', asaasErr);
    }

    const isPaid = paymentData && ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'].includes(paymentData.status);

    if (isPaid) {
      // Atualizar todos os tickets vinculados para PAID
      await prisma.ticket.updateMany({
        where: { asaasPaymentId: resolvedPaymentId },
        data: { status: 'PAID' }
      });
    }

    // Se for PIX e ainda não pago, busca dados do QR Code no Asaas caso necessário
    let pixQrCode = null;
    if (paymentData && paymentData.billingType === 'PIX' && !isPaid) {
      try {
        const pixRes = await fetch(`${asaasUrl}/payments/${resolvedPaymentId}/pixQrCode`, {
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey || ''
          }
        });
        if (pixRes.ok) {
          pixQrCode = await pixRes.json();
        }
      } catch (pixErr) {
        console.warn('Erro ao buscar QR Code PIX:', pixErr);
      }
    }

    // Buscar os tickets atualizados
    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { asaasPaymentId: resolvedPaymentId },
          { id: ticketId || '' }
        ]
      },
      include: { user: true }
    });

    return NextResponse.json({
      paid: isPaid || tickets.some(t => t.status === 'PAID'),
      status: paymentData?.status || (tickets[0]?.status || 'PENDING'),
      billingType: paymentData?.billingType,
      value: paymentData?.value,
      invoiceUrl: paymentData?.invoiceUrl,
      bankSlipUrl: paymentData?.bankSlipUrl,
      pixQrCode: pixQrCode,
      tickets: tickets.map(t => ({
        id: t.id,
        status: t.status,
        name: t.user.name,
        cpf: t.user.cpf,
        email: t.user.email
      }))
    });

  } catch (error: any) {
    console.error('Check Payment Error:', error);
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 });
  }
}
