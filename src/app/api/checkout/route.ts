import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Suporte tanto ao novo formato com múltiplos participantes quanto ao formato simples
    const buyerName = body.buyer?.name || body.name;
    const buyerEmail = body.buyer?.email || body.email;
    const buyerCpf = body.buyer?.cpf || body.cpf;
    const buyerPhone = body.buyer?.phone || body.phone;
    const buyerPassword = body.buyer?.password || body.password || 'Tjaem@2026';
    const paymentMethod = body.paymentMethod || 'PIX';

    // Lista de participantes (ingressos)
    let attendees = body.attendees;
    if (!Array.isArray(attendees) || attendees.length === 0) {
      attendees = [{
        name: buyerName,
        email: buyerEmail,
        cpf: buyerCpf
      }];
    }

    if (!buyerName || !buyerEmail || !buyerCpf) {
      return NextResponse.json({ error: 'Dados do comprador são obrigatórios' }, { status: 400 });
    }

    // 1. Obter ou criar o usuário comprador
    const cleanBuyerCpf = buyerCpf.replace(/\D/g, '');
    const cleanBuyerPhone = buyerPhone ? buyerPhone.replace(/\D/g, '') : '';

    let buyerUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: buyerEmail },
          { cpf: cleanBuyerCpf }
        ]
      }
    });

    if (!buyerUser) {
      const hashedPassword = await bcrypt.hash(buyerPassword, 10);
      buyerUser = await prisma.user.create({
        data: {
          name: buyerName,
          email: buyerEmail,
          cpf: cleanBuyerCpf,
          phone: cleanBuyerPhone,
          password: hashedPassword
        }
      });
    }

    // 2. Chamar a API do Asaas para obter ou gerar o Cliente (Comprador)
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasUrl = 'https://api.asaas.com/v3';

    let customerId = '';

    // Verifica se já existe cliente cadastrado com este CPF no Asaas
    try {
      const searchRes = await fetch(`${asaasUrl}/customers?cpfCnpj=${cleanBuyerCpf}`, {
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey || ''
        }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id;
        }
      }
    } catch (e) {
      console.warn('Erro ao pesquisar cliente no Asaas:', e);
    }

    // Se não existir, cadastra no Asaas
    if (!customerId) {
      const customerRes = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey || ''
        },
        body: JSON.stringify({
          name: buyerName,
          email: buyerEmail,
          cpfCnpj: cleanBuyerCpf,
          mobilePhone: cleanBuyerPhone
        })
      });

      const customerText = await customerRes.text();
      let customerData: any;
      try { customerData = JSON.parse(customerText); } catch { customerData = { raw: customerText }; }

      if (!customerRes.ok) {
        console.error(`Erro Asaas Customer (Status: ${customerRes.status}):`, customerData);
        let errorMessage = 'Erro ao cadastrar cliente no portal de pagamentos';
        if (customerRes.status === 401) {
          errorMessage = 'Erro de Autenticação (401) no Asaas. Verifique a chave de API.';
        }
        return NextResponse.json({ error: errorMessage, details: `Status: ${customerRes.status} | Resposta: ${customerText}` }, { status: 500 });
      }

      customerId = customerData.id;
    }

    // 3. Calcular Valor Total e Gerar a Cobrança no Asaas
    const ticketCount = attendees.length;
    const unitPrice = 150.00;
    const totalAmount = ticketCount * unitPrice;

    const chargePayload: any = {
      customer: customerId,
      billingType: paymentMethod, // PIX, CREDIT_CARD, BOLETO
      value: totalAmount,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Vence em +1 dia
      description: `Ingresso(s) - 30 Anos da Lei de Arbitragem no Brasil (${ticketCount} ${ticketCount > 1 ? 'ingressos' : 'ingresso'})`
    };

    const chargeRes = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey || ''
      },
      body: JSON.stringify(chargePayload)
    });

    const chargeText = await chargeRes.text();
    let chargeData: any;
    try { chargeData = JSON.parse(chargeText); } catch { chargeData = { raw: chargeText }; }

    if (!chargeRes.ok) {
      console.error(`Erro Asaas Pagamento (Status: ${chargeRes.status}):`, chargeData);
      let errorMessage = 'Erro ao gerar cobrança no portal de pagamentos';
      if (chargeRes.status === 401) {
        errorMessage = 'Erro de Autenticação (401) ao gerar cobrança no Asaas.';
      }
      return NextResponse.json({ error: errorMessage, details: `Status: ${chargeRes.status} | Resposta: ${chargeText}` }, { status: 500 });
    }

    // 4. Cadastrar Usuários Participantes e Criar os Ingressos (Status PENDING)
    const createdTickets = [];

    for (const attendee of attendees) {
      const cleanAttCpf = (attendee.cpf || '').replace(/\D/g, '');
      const attEmail = attendee.email?.trim() || buyerEmail;
      const attName = attendee.name?.trim() || buyerName;

      let attendeeUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: attEmail },
            { cpf: cleanAttCpf }
          ]
        }
      });

      if (!attendeeUser) {
        const defaultPwd = await bcrypt.hash('Tjaem@2026', 10);
        attendeeUser = await prisma.user.create({
          data: {
            name: attName,
            email: attEmail,
            cpf: cleanAttCpf,
            phone: cleanBuyerPhone,
            password: defaultPwd
          }
        });
      }

      const ticket = await prisma.ticket.create({
        data: {
          userId: attendeeUser.id,
          asaasPaymentId: chargeData.id,
          paymentMethod: paymentMethod,
          amount: unitPrice,
          status: 'PENDING' // Fica PENDENTE até o pagamento ser confirmado!
        }
      });

      createdTickets.push({
        id: ticket.id,
        name: attendeeUser.name,
        cpf: attendeeUser.cpf,
        email: attendeeUser.email
      });
    }

    // 5. Se for PIX, buscar dados do QR Code no Asaas
    let pixData = null;
    if (paymentMethod === 'PIX') {
      try {
        const pixRes = await fetch(`${asaasUrl}/payments/${chargeData.id}/pixQrCode`, {
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey || ''
          }
        });
        if (pixRes.ok) {
          pixData = await pixRes.json();
        }
      } catch (pixErr) {
        console.warn('Erro ao obter QR Code PIX do Asaas:', pixErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: chargeData.id,
      ticketCount: createdTickets.length,
      primaryTicketId: createdTickets[0]?.id,
      tickets: createdTickets,
      paymentUrl: chargeData.invoiceUrl,
      bankSlipUrl: chargeData.bankSlipUrl,
      pixQrCode: pixData, // { encodedImage, payload, expirationDate }
      totalAmount
    });

  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor', details: error.message }, { status: 500 });
  }
}
