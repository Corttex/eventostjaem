import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, forceConfirm } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Código QR / Token não fornecido' }, { status: 400 });
    }

    const cleanToken = token.trim();

    // Buscar ingresso pelo qrCodeToken ou pelo ID
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { qrCodeToken: cleanToken },
          { id: cleanToken }
        ]
      },
      include: {
        user: true
      }
    });

    if (!ticket) {
      return NextResponse.json({
        success: false,
        error: 'Ingresso não encontrado ou inválido no sistema.'
      }, { status: 404 });
    }

    // Caso já tenha sido bipado
    if (ticket.scanned) {
      return NextResponse.json({
        success: false,
        alreadyScanned: true,
        scannedAt: ticket.scannedAt,
        ticket: {
          id: ticket.id,
          name: ticket.user.name,
          cpf: ticket.user.cpf,
          status: ticket.status
        },
        error: `ALERTA: Ingresso já utilizado anteriormente em ${ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleTimeString('pt-BR') : 'horário anterior'}!`
      }, { status: 409 });
    }

    // Caso o pagamento ainda esteja pendente
    if (ticket.status !== 'PAID' && !forceConfirm) {
      return NextResponse.json({
        success: false,
        isPending: true,
        ticket: {
          id: ticket.id,
          name: ticket.user.name,
          cpf: ticket.user.cpf,
          status: ticket.status
        },
        error: 'ATENÇÃO: Ingresso com PAGAMENTO PENDENTE no Asaas. Deseja liberar a entrada mesmo assim?'
      }, { status: 402 });
    }

    // Confirmar Check-in
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        scanned: true,
        scannedAt: new Date(),
        ...(forceConfirm ? { status: 'PAID' } : {})
      },
      include: {
        user: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Entrada autorizada para ${updatedTicket.user.name}!`,
      ticket: {
        id: updatedTicket.id,
        name: updatedTicket.user.name,
        cpf: updatedTicket.user.cpf,
        email: updatedTicket.user.email,
        status: updatedTicket.status,
        scanned: updatedTicket.scanned,
        scannedAt: updatedTicket.scannedAt
      }
    });

  } catch (error: any) {
    console.error('Scan Ticket Error:', error);
    return NextResponse.json({ error: 'Erro ao validar ingresso', details: error.message }, { status: 500 });
  }
}
