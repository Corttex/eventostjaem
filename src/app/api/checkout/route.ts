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

    const customerText = await customerRes.text();
    let customerData;
    try { customerData = JSON.parse(customerText); } catch { customerData = { raw: customerText }; }
    
    if (!customerRes.ok) {
      console.error(`Erro Asaas Customer (Status: ${customerRes.status}):`, customerData);
      
      let errorMessage = 'Erro ao cadastrar cliente no portal de pagamentos';
      if (customerRes.status === 401) {
        errorMessage = 'Erro de Autenticação (401) no Asaas. Verifique se a sua API Key (access_token) está correta e se a conta é de Produção/Sandbox adequada.';
      }
      
      return NextResponse.json({ error: errorMessage, details: `Status: ${customerRes.status} | Resposta: ${customerText}` }, { status: 500 });
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

    const chargeText = await chargeRes.text();
    let chargeData;
    try { chargeData = JSON.parse(chargeText); } catch { chargeData = { raw: chargeText }; }
    
    if (!chargeRes.ok) {
      console.error(`Erro Asaas Pagamento (Status: ${chargeRes.status}):`, chargeData);
      
      let errorMessage = 'Erro ao gerar pagamento';
      if (chargeRes.status === 401) {
        errorMessage = 'Erro de Autenticação (401) ao gerar cobrança no Asaas.';
      }

      return NextResponse.json({ error: errorMessage, details: `Status: ${chargeRes.status} | Resposta: ${chargeText}` }, { status: 500 });
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
