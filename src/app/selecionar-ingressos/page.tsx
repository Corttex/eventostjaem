'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Ticket, Users, ShieldCheck, CheckCircle2, CreditCard, QrCode, FileText } from 'lucide-react';

interface Attendee {
  name: string;
  email: string;
  cpf: string;
}

export default function SelecionarIngressosPage() {
  const router = useRouter();

  // Dados do Comprador
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerPassword, setBuyerPassword] = useState('');

  // Quantidade e Participantes
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<Attendee[]>([
    { name: '', email: '', cpf: '' }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [loading, setLoading] = useState(false);

  const pricePerTicket = 150.00;

  // Carregar dados salvos da página anterior
  useEffect(() => {
    try {
      const savedBuyer = sessionStorage.getItem('tjaem_buyer_data');
      if (savedBuyer) {
        const parsed = JSON.parse(savedBuyer);
        setBuyerName(parsed.name || '');
        setBuyerEmail(parsed.email || '');
        setBuyerCpf(parsed.cpf || '');
        setBuyerPhone(parsed.phone || '');
        setBuyerPassword(parsed.password || '');

        // Preenche o participante 1 por padrão
        setAttendees([
          {
            name: parsed.name || '',
            email: parsed.email || '',
            cpf: parsed.cpf || ''
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Atualizar a lista de participantes quando a quantidade muda
  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > 10) return;
    setQuantity(newQty);

    const updated = [...attendees];
    if (newQty > updated.length) {
      // Adiciona novos participantes vazios
      for (let i = updated.length; i < newQty; i++) {
        updated.push({ name: '', email: '', cpf: '' });
      }
    } else {
      // Reduz a lista
      updated.splice(newQty);
    }
    setAttendees(updated);
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], [field]: value };
    setAttendees(updated);
  };

  // Se o participante 1 for o mesmo que o comprador, sincroniza se estiver vazio
  const syncBuyerWithFirstAttendee = () => {
    if (attendees.length > 0 && !attendees[0].name) {
      updateAttendee(0, 'name', buyerName);
      updateAttendee(0, 'email', buyerEmail);
      updateAttendee(0, 'cpf', buyerCpf);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar dados do comprador
      if (!buyerName || !buyerEmail || !buyerCpf) {
        alert('Por favor, preencha todos os dados do comprador.');
        setLoading(false);
        return;
      }

      // Validar participantes
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        if (!att.name?.trim() || !att.email?.trim() || !att.cpf?.trim()) {
          alert(`Por favor, preencha o Nome Completo, E-mail e CPF do Participante ${i + 1}.`);
          setLoading(false);
          return;
        }
      }

      const payload = {
        buyer: {
          name: buyerName,
          email: buyerEmail,
          cpf: buyerCpf,
          phone: buyerPhone,
          password: buyerPassword || 'Tjaem@2026'
        },
        attendees: attendees,
        paymentMethod: paymentMethod
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // Armazenar os detalhes do pagamento para a tela de confirmação
        sessionStorage.setItem('tjaem_last_payment', JSON.stringify(result));
        
        // Se houver URL externa e não for PIX nativo, abre a tela do Asaas
        if (result.paymentUrl && paymentMethod !== 'PIX') {
          window.open(result.paymentUrl, '_blank');
        }

        // Redireciona para a página de confirmação
        router.push(`/sucesso/${result.paymentId || result.primaryTicketId}`);
      } else {
        alert(`${result.error || 'Erro ao processar'}${result.details ? ': ' + result.details : ''}`);
      }
    } catch (err: any) {
      alert('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const total = quantity * pricePerTicket;

  return (
    <main className="container" style={{ padding: '3rem 1rem 6rem', maxWidth: '850px' }}>
      
      {/* Botão Voltar */}
      <Link href="/" className="flex items-center gap-2" style={{ color: 'var(--primary)', marginBottom: '2rem', textDecoration: 'none', fontWeight: 600 }}>
        <ArrowLeft size={20} />
        Voltar para a página do evento
      </Link>

      {/* Card de Apresentação do Evento */}
      <div className="glass-panel animate-fade-up" style={{ padding: '2rem', marginBottom: '2.5rem', border: '1px solid rgba(223, 186, 82, 0.3)' }}>
        <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 600 }}>
              Evento Oficial Comemorativo
            </span>
            <h1 className="gold-gradient-text" style={{ fontSize: '2.2rem', margin: '0.4rem 0 0.8rem', lineHeight: 1.2 }}>
              30 Anos da Lei de Arbitragem no Brasil
            </h1>
          </div>
          <div style={{ textAlign: 'right', minWidth: '160px' }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Valor do Ingresso:</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
              R$ 150,00 <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/ un.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mobile-col" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.2rem' }}>
          <div className="flex items-center gap-3">
            <Calendar size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
              20 de Outubro de 2026 • 09h às 17h
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
              SGAS quadra 603 Sul, L2 Sul — Asa Sul, Brasília / DF
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        
        {/* Etapa 1: Dados do Comprador */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={22} color="var(--primary)" />
            1. Dados do Responsável pela Compra
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Estes dados serão utilizados para faturamento e envio dos comprovantes.
          </p>

          <div className="grid grid-cols-2 gap-4 mobile-col">
            <div>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>Nome Completo *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Seu nome completo"
                value={buyerName}
                onChange={e => { setBuyerName(e.target.value); syncBuyerWithFirstAttendee(); }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>E-mail *</label>
              <input
                type="email"
                className="input-field"
                placeholder="seu.email@exemplo.com"
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mobile-col" style={{ marginTop: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>CPF *</label>
              <input
                type="text"
                className="input-field"
                placeholder="000.000.000-00"
                value={buyerCpf}
                onChange={e => setBuyerCpf(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>WhatsApp / Telefone *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="(61) 99999-9999"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>Crie uma Senha para acessar sua conta</label>
            <input
              type="password"
              className="input-field"
              placeholder="Sua senha para consultar ingressos futuramente"
              value={buyerPassword}
              onChange={e => setBuyerPassword(e.target.value)}
            />
          </div>
        </section>

        {/* Etapa 2: Seleção de Quantidade */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Ticket size={22} color="var(--primary)" />
                2. Quantidade de Ingressos
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: '0.4rem 0 0' }}>
                Selecione quantos ingressos nominais você deseja adquirir.
              </p>
            </div>

            {/* Controle de Quantidade */}
            <div className="flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(223, 186, 82, 0.4)' }}>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: quantity <= 1 ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                  padding: '0 0.5rem'
                }}
              >
                -
              </button>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 10}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: quantity >= 10 ? 'rgba(255,255,255,0.3)' : 'var(--primary)',
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  cursor: quantity >= 10 ? 'not-allowed' : 'pointer',
                  padding: '0 0.5rem'
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(223, 186, 82, 0.08)', padding: '1rem 1.5rem', borderRadius: '10px', borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)' }}>
              Subtotal: <strong>{quantity}x</strong> R$ 150,00
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </section>

        {/* Etapa 3: Dados dos Participantes */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={22} color="var(--primary)" />
            3. Identificação dos Ingressos Nominais
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.8rem' }}>
            Por segurança e emissão dos certificados, cada ingresso emitido possui QR Code exclusivo e dados nominais do participante.
          </p>

          <div className="flex flex-col gap-6">
            {attendees.map((attendee, index) => (
              <div 
                key={index} 
                style={{
                  background: 'rgba(0, 0, 0, 0.35)', 
                  padding: '1.5rem', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '1.2rem' }}>
                  <span style={{ 
                    background: 'var(--primary)', 
                    color: '#000', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    padding: '0.25rem 0.8rem', 
                    borderRadius: '20px' 
                  }}>
                    INGRESSO {index + 1} {index === 0 ? '(Principal)' : ''}
                  </span>

                  {index === 0 && buyerName && (
                    <button
                      type="button"
                      onClick={() => {
                        updateAttendee(0, 'name', buyerName);
                        updateAttendee(0, 'email', buyerEmail);
                        updateAttendee(0, 'cpf', buyerCpf);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Copiar dados do Comprador
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mobile-col">
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.35rem', display: 'block' }}>
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nome do participante"
                      value={attendee.name}
                      onChange={e => updateAttendee(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.35rem', display: 'block' }}>
                      E-mail *
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="email@participante.com"
                      value={attendee.email}
                      onChange={e => updateAttendee(index, 'email', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.35rem', display: 'block' }}>
                      CPF *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="000.000.000-00"
                      value={attendee.cpf}
                      onChange={e => updateAttendee(index, 'cpf', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Etapa 4: Método de Pagamento */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CreditCard size={22} color="var(--primary)" />
            4. Forma de Pagamento
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Selecione como deseja efetuar o pagamento.
          </p>

          <div className="grid grid-cols-3 gap-4 mobile-col">
            {/* Opção PIX */}
            <label 
              className="custom-radio flex items-center gap-3" 
              style={{ 
                cursor: 'pointer', 
                border: paymentMethod === 'PIX' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                padding: '1.2rem',
                borderRadius: '12px',
                background: paymentMethod === 'PIX' ? 'rgba(223, 186, 82, 0.1)' : 'rgba(0,0,0,0.2)'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="PIX"
                checked={paymentMethod === 'PIX'}
                onChange={() => setPaymentMethod('PIX')}
              />
              <div className="flex flex-col">
                <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <QrCode size={18} color="var(--primary)" /> PIX
                </span>
                <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>Aprovação Instantânea</span>
              </div>
            </label>

            {/* Opção Cartão */}
            <label 
              className="custom-radio flex items-center gap-3"
              style={{ 
                cursor: 'pointer', 
                border: paymentMethod === 'CREDIT_CARD' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                padding: '1.2rem',
                borderRadius: '12px',
                background: paymentMethod === 'CREDIT_CARD' ? 'rgba(223, 186, 82, 0.1)' : 'rgba(0,0,0,0.2)'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CREDIT_CARD"
                checked={paymentMethod === 'CREDIT_CARD'}
                onChange={() => setPaymentMethod('CREDIT_CARD')}
              />
              <div className="flex flex-col">
                <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={18} color="var(--primary)" /> Cartão
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Crédito online</span>
              </div>
            </label>

            {/* Opção Boleto */}
            <label 
              className="custom-radio flex items-center gap-3"
              style={{ 
                cursor: 'pointer', 
                border: paymentMethod === 'BOLETO' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                padding: '1.2rem',
                borderRadius: '12px',
                background: paymentMethod === 'BOLETO' ? 'rgba(223, 186, 82, 0.1)' : 'rgba(0,0,0,0.2)'
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="BOLETO"
                checked={paymentMethod === 'BOLETO'}
                onChange={() => setPaymentMethod('BOLETO')}
              />
              <div className="flex flex-col">
                <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="var(--primary)" /> Boleto
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Compensação bancária</span>
              </div>
            </label>
          </div>
        </section>

        {/* Resumo Final e Botão de Ação */}
        <div className="glass-panel text-center" style={{ padding: '2rem', border: '1px solid var(--primary)' }}>
          <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Total da Compra:</span>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                R$ {total.toFixed(2).replace('.', ',')}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                {quantity} {quantity > 1 ? 'credenciais oficiais' : 'credencial oficial'}
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: '1.25rem', padding: '1.2rem 2.5rem', minWidth: '280px' }}
              disabled={loading}
            >
              {loading ? 'Gerando Cobrança...' : 'Confirmar e Ir para Pagamento'}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            🔒 Transação 100% segura processada pelo Asaas. Seus ingressos oficiais serão liberados assim que o pagamento for compensado.
          </p>
        </div>

      </form>
    </main>
  );
}
