import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAsaasApiKey } from '@/lib/asaas';
import { prisma } from '@/lib/prisma';

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
    const asaasApiKey = getAsaasApiKey();
    const asaasUrl = 'https://api.asaas.com/v3';

    if (!asaasApiKey || asaasApiKey.length < 15) {
      console.error('ASAAS_API_KEY ausente ou não configurada.');
      return NextResponse.json({ 
        error: 'Chave ASAAS_API_KEY não encontrada nas Variáveis de Ambiente do Coolify. Por favor, adicione ASAAS_API_KEY no painel do Coolify da aplicação.' 
      }, { status: 500 });
    }

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

    // Se não encontrou por CPF, tenta pesquisar por e-mail no Asaas
    if (!customerId && buyerEmail) {
      try {
        const searchEmailRes = await fetch(`${asaasUrl}/customers?email=${encodeURIComponent(buyerEmail)}`, {
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey || ''
          }
        });
        if (searchEmailRes.ok) {
          const emailData = await searchEmailRes.json();
          if (emailData.data && emailData.data.length > 0) {
            customerId = emailData.data[0].id;
          }
        }
      } catch (e) {
        console.warn('Erro ao pesquisar cliente por email no Asaas:', e);
      }
    }

    // Se não existir, cadastra no Asaas
    if (!customerId) {
      const customerPayload: any = {
        name: buyerName,
        email: buyerEmail,
        cpfCnpj: cleanBuyerCpf
      };

      // Só envia telefone se tiver formato válido brasileiro (10 ou 11 dígitos com DDD)
      if (cleanBuyerPhone && (cleanBuyerPhone.length === 10 || cleanBuyerPhone.length === 11) && !/^(\d)\1+$/.test(cleanBuyerPhone)) {
        customerPayload.mobilePhone = cleanBuyerPhone;
      }

      const customerRes = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasApiKey || ''
        },
        body: JSON.stringify(customerPayload)
      });

      const customerText = await customerRes.text();
      let customerData: any;
      try { customerData = JSON.parse(customerText); } catch { customerData = { raw: customerText }; }

      if (!customerRes.ok) {
        console.error(`Erro Asaas Customer (Status: ${customerRes.status}):`, customerData);
        let errorMessage = 'Erro ao cadastrar cliente no portal de pagamentos';
        if (customerRes.status === 401) {
          errorMessage = 'Erro de Autenticação (401) no Asaas. Verifique a chave de API.';
        } else if (customerData?.errors?.[0]?.description) {
          errorMessage = customerData.errors[0].description;
        }
        return NextResponse.json({ error: errorMessage, details: customerData }, { status: customerRes.status >= 400 && customerRes.status < 500 ? 400 : 500 });
      }

      customerId = customerData.id;
    }

    // 3. Calcular Valor Total e Gerar a Cobrança no Asaas
    const ticketCount = attendees.length;
    const installments = Math.min(Math.max(Number(body.installments) || 1, 1), 10);
    
    // Configuração de Preço: R$ 390,00 no PIX / Boleto ou R$ 490,00 no Cartão de Crédito
    const BASE_TICKET_PRICE = paymentMethod === 'CREDIT_CARD' ? 490.00 : 390.00;
    const KIT_PRICE = 109.90;
    const BUFFET_PRICE = 139.90;

    // Processamento de cada participante com seus opcionais
    let totalAmount = 0;
    const attendeeProcessedData: any[] = [];

    for (const attendee of attendees) {
      const hasKit = attendee.hasKit !== undefined ? Boolean(attendee.hasKit) : Boolean(body.hasKit);
      const hasBuffet = attendee.hasBuffet !== undefined ? Boolean(attendee.hasBuffet) : Boolean(body.hasBuffet);
      
      let attendeePrice = BASE_TICKET_PRICE;
      const extras: string[] = [];
      if (hasKit) {
        attendeePrice += KIT_PRICE;
        extras.push('KIT 30 ANOS');
      }
      if (hasBuffet) {
        attendeePrice += BUFFET_PRICE;
        extras.push('ALMOÇO BUFFET');
      }

      attendeePrice = Math.round(attendeePrice * 100) / 100;
      totalAmount += attendeePrice;

      let typeDesc = 'INGRESSO_UNICO';
      if (extras.length > 0) {
        typeDesc += ' + ' + extras.join(' + ');
      }

      attendeeProcessedData.push({
        ...attendee,
        hasKit,
        hasBuffet,
        price: attendeePrice,
        typeDesc
      });
    }

    totalAmount = Math.round(totalAmount * 100) / 100;

    let chargeDescription = `Seminário Nacional 30 Anos Arbitragem e Mediação - Ingresso Oficial (${ticketCount} ${ticketCount > 1 ? 'participantes' : 'participante'})`;
    if (paymentMethod === 'CREDIT_CARD' && installments > 1) {
      chargeDescription += ` em ${installments}x sem juros`;
    }

    const chargePayload: any = {
      customer: customerId,
      billingType: paymentMethod, // PIX, CREDIT_CARD, BOLETO
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Vence em +1 dia
      description: chargeDescription
    };

    if (paymentMethod === 'CREDIT_CARD' && installments > 1) {
      chargePayload.installmentCount = installments;
      chargePayload.totalValue = totalAmount;
    } else {
      chargePayload.value = totalAmount;
    }

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
      } else if (chargeData?.errors?.[0]?.description) {
        errorMessage = chargeData.errors[0].description;
      }
      return NextResponse.json({ error: errorMessage, details: chargeData }, { status: chargeRes.status >= 400 && chargeRes.status < 500 ? 400 : 500 });
    }

    // 4. Cadastrar Usuários Participantes e Criar os Ingressos (Status PENDING)
    const createdTickets = [];

    for (let i = 0; i < attendeeProcessedData.length; i++) {
      const attendee = attendeeProcessedData[i];
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

      const methodLabel = paymentMethod === 'CREDIT_CARD' && installments > 1 
        ? `CREDIT_CARD_${installments}X` 
        : paymentMethod;

      const ticket = await prisma.ticket.create({
        data: {
          userId: attendeeUser.id,
          asaasPaymentId: chargeData.id,
          paymentMethod: methodLabel,
          amount: attendee.price,
          ticketType: attendee.typeDesc,
          status: 'PENDING', // Fica PENDENTE até o pagamento ser confirmado!
          isAssociate: false,
          associateRegistration: null,
          associateDocUrl: null,
          associateApproved: false,
          discountAmount: 0
        }
      });

      createdTickets.push({
        id: ticket.id,
        name: attendeeUser.name,
        cpf: attendeeUser.cpf,
        email: attendeeUser.email,
        ticketType: ticket.ticketType,
        hasKit: attendee.hasKit,
        hasBuffet: attendee.hasBuffet,
        amount: ticket.amount,
        isAssociate: ticket.isAssociate,
        associateApproved: ticket.associateApproved
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
    return NextResponse.json({ error: error?.message || 'Erro interno no servidor', details: error?.stack || error?.message }, { status: 500 });
  }
}
