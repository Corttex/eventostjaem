import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, cpf, phone, password, paymentMethod } = await req.json();

    if (!name || !email || !cpf || !password || !paymentMethod) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // 1. Verificar se usuário já existe
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: { name, email, cpf, phone, password: hashedPassword }
      });
    }

    // 2. Chamar a API do Asaas para gerar o Cliente
    const asaasApiKey = process.env.ASAAS_API_KEY;
    const asaasUrl = 'https://api.asaas.com/v3';

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    const customerRes = await fetch(`${asaasUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey || ''
      },
      body: JSON.stringify({ name, email, cpfCnpj: cleanCpf, mobilePhone: cleanPhone })
    });

    const customerData = await customerRes.json();
    if (!customerRes.ok) {
      console.error('Erro Asaas Customer:', customerData);
      return NextResponse.json({ error: 'Erro ao cadastrar cliente no portal de pagamentos' }, { status: 500 });
    }

    // 3. Gerar a Cobrança
    const chargeRes = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey || ''
      },
      body: JSON.stringify({
        customer: customerData.id,
        billingType: paymentMethod, // PIX, CREDIT_CARD, BOLETO
        value: 150.00, // Valor do ingresso fixo
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // +1 dia
        description: 'Ingresso - 30 Anos da Lei de Arbitragem no Brasil'
      })
    });

    const chargeData = await chargeRes.json();
    if (!chargeRes.ok) {
      console.error('Erro Asaas Pagamento:', chargeData);
      return NextResponse.json({ error: 'Erro ao gerar pagamento' }, { status: 500 });
    }

    // 4. Salvar o Ticket no Banco de Dados
    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        asaasPaymentId: chargeData.id,
        paymentMethod: paymentMethod,
        amount: 150.00
      }
    });

    // 5. Retornar os dados de pagamento (Ex: link do boleto ou QR Code do PIX)
    return NextResponse.json({ 
      success: true, 
      ticketId: ticket.id,
      paymentUrl: chargeData.invoiceUrl,
      pixQrCode: paymentMethod === 'PIX' ? chargeData.pixQrCode : null
    });

  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor', details: error.message }, { status: 500 });
  }
}
