import Link from 'next/link';
import { CheckCircle2, FileText, CreditCard } from 'lucide-react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function SucessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: id },
    include: { user: true }
  });

  if (!ticket) {
    return (
      <main className="container flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="glass-panel text-center">
          <h1 style={{ color: 'red' }}>Ingresso não encontrado</h1>
        </div>
      </main>
    );
  }

  // Se for PIX/Boleto, precisamos da URL do Asaas para o cliente pagar. (Salvamos na base? Não salvamos a URL no DB, mas podemos deduzir ou deveríamos ter salvo. Por simplicidade, vamos usar o fato de que Asaas envia por email também, mas o ideal seria salvar a Invoice URL no DB).
  // Vamos exibir a opção de baixar o ingresso.

  return (
    <main className="container flex flex-col items-center justify-center animate-fade-up" style={{ minHeight: '90vh', padding: '2rem 0' }}>
      <div className="glass-panel text-center" style={{ maxWidth: '600px', width: '100%' }}>
        <CheckCircle2 color="#4ade80" size={64} style={{ margin: '0 auto 1.5rem' }} />
        
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Inscrição Registrada!</h1>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>
          Olá, {ticket.user.name.split(' ')[0]}! Seu ingresso já foi gerado.
        </p>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>O que acontece agora?</p>
          <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8 }}>
            <li>O link oficial de pagamento do Asaas e o recibo foram enviados para o seu e-mail: <strong>{ticket.user.email}</strong>.</li>
            <li>Realize o pagamento para ativar a validade do seu QR Code no dia do evento.</li>
            <li>Você já pode baixar o PDF do seu ingresso abaixo.</li>
          </ul>
        </div>

        <div className="flex gap-4 flex-col">
          <Link href={`/api/ticket/${ticket.id}`} target="_blank" className="btn-primary" style={{ width: '100%', fontSize: '1.2rem', padding: '1.5rem' }}>
            <FileText size={24} />
            Baixar Ingresso (PDF)
          </Link>

          <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem', display: 'inline-block' }}>
            Voltar para o site
          </Link>
        </div>
      </div>
    </main>
  );
}
