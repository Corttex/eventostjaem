'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, MapPin, Ticket, Users, ShieldCheck, 
  CreditCard, QrCode, FileText, Check, Sparkles, UtensilsCrossed, Droplets, Coffee
} from 'lucide-react';

interface Attendee {
  name: string;
  email: string;
  cpf: string;
  hasKit: boolean;
  hasBuffet: boolean;
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
    { name: '', email: '', cpf: '', hasKit: false, hasBuffet: false }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);

  // Valores fixos
  const PIX_PRICE = 390.00;
  const CARD_PRICE = 490.00;
  const BASE_PRICE = paymentMethod === 'CREDIT_CARD' ? CARD_PRICE : PIX_PRICE;
  const KIT_PRICE = 109.90;
  const BUFFET_PRICE = 139.90;

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

        const initialHasKit = Boolean(parsed.hasKit);
        const initialHasBuffet = Boolean(parsed.hasBuffet);

        // Preenche o participante 1 com os dados do comprador e opções escolhidas na home
        setAttendees([
          {
            name: parsed.name || '',
            email: parsed.email || '',
            cpf: parsed.cpf || '',
            hasKit: initialHasKit,
            hasBuffet: initialHasBuffet
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
      // Adiciona novos participantes vazios mantendo as opções de kit/buffet do primeiro
      const defaultKit = attendees[0]?.hasKit || false;
      const defaultBuffet = attendees[0]?.hasBuffet || false;
      for (let i = updated.length; i < newQty; i++) {
        updated.push({ name: '', email: '', cpf: '', hasKit: defaultKit, hasBuffet: defaultBuffet });
      }
    } else {
      updated.splice(newQty);
    }
    setAttendees(updated);
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: any) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], [field]: value };
    setAttendees(updated);
  };

  const syncBuyerWithFirstAttendee = () => {
    if (attendees.length > 0 && !attendees[0].name) {
      updateAttendee(0, 'name', buyerName);
      updateAttendee(0, 'email', buyerEmail);
      updateAttendee(0, 'cpf', buyerCpf);
    }
  };

  // Cálculos de Total
  const totalBase = quantity * BASE_PRICE;
  const countKits = attendees.filter(a => a.hasKit).length;
  const countBuffets = attendees.filter(a => a.hasBuffet).length;
  const totalKits = countKits * KIT_PRICE;
  const totalBuffets = countBuffets * BUFFET_PRICE;
  const totalAmount = totalBase + totalKits + totalBuffets;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!buyerName || !buyerEmail || !buyerCpf) {
        alert('Por favor, preencha todos os dados do comprador.');
        setLoading(false);
        return;
      }

      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        if (!att.name || !att.cpf) {
          alert(`Por favor, preencha o Nome e o CPF do Ingresso ${i + 1}.`);
          setLoading(false);
          return;
        }
      }

      const checkoutPayload = {
        buyer: {
          name: buyerName,
          email: buyerEmail,
          cpf: buyerCpf,
          phone: buyerPhone,
          password: buyerPassword
        },
        ticketType: 'UNICO',
        paymentMethod,
        installments: paymentMethod === 'CREDIT_CARD' ? installments : 1,
        attendees: attendees.map(a => ({
          name: a.name,
          email: a.email || buyerEmail,
          cpf: a.cpf,
          hasKit: a.hasKit,
          hasBuffet: a.hasBuffet
        }))
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || 'Erro ao processar pagamento.');
        setLoading(false);
        return;
      }

      if (result.paymentId) {
        sessionStorage.setItem('tjaem_last_payment', JSON.stringify(result));
      }

      if (result.paymentUrl && paymentMethod !== 'PIX') {
        window.location.href = result.paymentUrl;
        return;
      }

      const redirectId = result.paymentId || result.primaryTicketId;
      router.push(`/sucesso/${redirectId}`);

    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao gerar cobrança.');
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: '3rem 1rem 6rem', maxWidth: '850px' }}>
      
      {/* Botão Voltar */}
      <Link href="/" className="flex items-center gap-3" style={{ color: 'var(--primary)', marginBottom: '2rem', textDecoration: 'none', fontWeight: 600 }}>
        <ArrowLeft size={20} style={{ flexShrink: 0 }} />
        <span>Voltar para a página do evento</span>
      </Link>

      {/* Card de Apresentação do Evento */}
      <div className="glass-panel animate-fade-up" style={{ padding: '2rem', marginBottom: '2.5rem', border: '1px solid rgba(223, 186, 82, 0.35)' }}>
        <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 700 }}>
              ★ Inscrição Oficial • 30 Anos
            </span>
            <h1 className="gold-gradient-text" style={{ fontSize: '2.2rem', margin: '0.3rem 0 0.5rem', lineHeight: 1.2 }}>
              Seminário Nacional de Arbitragem
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(223, 186, 82, 0.15)', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--primary)' }}>
              <span style={{ fontSize: '0.85rem', color: '#ffeca8', fontWeight: 700 }}>
                Ingresso Único: Certificados + Credencial + Apostila + E-book + Café & Água o dia todo
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '170px' }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Ingresso Base:</span>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)' }}>
              R$ {BASE_PRICE.toFixed(2).replace('.', ',')}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#ffeca8', display: 'block', marginTop: '0.2rem' }}>
              Até 10x sem juros
            </span>
          </div>
        </div>

        <div className="flex gap-8 mobile-col" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.2rem' }}>
          <div className="flex items-center gap-3">
            <Calendar size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
              01 de Dezembro de 2026 • 09h às 18h
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} color="var(--primary)" />
            <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
              Versá Restaurante & Eventos • Núcleo Bandeirante, DF
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        
        {/* Etapa 1: Dados do Comprador */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.4rem', display: 'block' }}>Crie uma Senha para consultar ingressos</label>
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
          <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.2rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Ticket size={22} color="var(--primary)" />
                2. Quantidade de Ingressos
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: '0.3rem 0 0' }}>
                Selecione quantos ingressos nominais você deseja emitir nesta transação.
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
        </section>

        {/* Etapa 3: Dados dos Participantes e Opcionais */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={22} color="var(--primary)" />
            3. Identificação dos Ingressos & Opcionais
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.8rem' }}>
            Cada ingresso nominal dá acesso completo ao evento. Você pode adicionar Kit Oficial e Almoço Buffet para cada participante individualmente.
          </p>

          <div className="flex flex-col gap-6">
            {attendees.map((attendee, index) => (
              <div 
                key={index} 
                style={{
                  background: 'rgba(0, 0, 0, 0.35)', 
                  padding: '1.6rem', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  position: 'relative'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '1.2rem' }}>
                  <span style={{ 
                    background: 'var(--primary)', 
                    color: '#000', 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    padding: '0.25rem 0.8rem', 
                    borderRadius: '20px' 
                  }}>
                    INGRESSO {index + 1} {index === 0 ? '(Responsável)' : ''}
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

                <div className="grid grid-cols-3 gap-4 mobile-col" style={{ marginBottom: '1.2rem' }}>
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

                {/* Seleção de Opcionais por Participante */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  gap: '1.2rem',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={attendee.hasKit}
                      onChange={e => updateAttendee(index, 'hasKit', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#dfba52', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', color: attendee.hasKit ? '#ffeca8' : 'rgba(255,255,255,0.85)', fontWeight: attendee.hasKit ? 700 : 500 }}>
                      + Kit Oficial 30 Anos (+ R$ 109,90)
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={attendee.hasBuffet}
                      onChange={e => updateAttendee(index, 'hasBuffet', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#dfba52', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', color: attendee.hasBuffet ? '#ffeca8' : 'rgba(255,255,255,0.85)', fontWeight: attendee.hasBuffet ? 700 : 500 }}>
                      + Almoço Buffet Completo (+ R$ 139,90)
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Etapa 4: Método de Pagamento com Parcelamento em até 10x sem juros */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', color: '#fff', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CreditCard size={22} color="var(--primary)" />
            4. Forma de Pagamento
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Selecione como deseja efetuar o pagamento. Cartão de crédito liberado em até <strong>10x sem juros</strong>.
          </p>

          <div className="grid grid-cols-2 gap-4 mobile-col" style={{ marginBottom: '1.5rem' }}>
            {/* Opção PIX */}
            <label 
              className="custom-radio flex items-center gap-3" 
              style={{ 
                cursor: 'pointer', 
                border: paymentMethod === 'PIX' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                padding: '1.2rem',
                borderRadius: '12px',
                background: paymentMethod === 'PIX' ? 'rgba(223, 186, 82, 0.12)' : 'rgba(0,0,0,0.2)'
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
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <QrCode size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>PIX — R$ 390,00</span>
                </span>
                <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>Valor Promocional • Aprovação Instantânea</span>
              </div>
            </label>

            {/* Opção Cartão de Crédito (até 10x sem juros) */}
            <label 
              className="custom-radio flex items-center gap-3"
              style={{ 
                cursor: 'pointer', 
                border: paymentMethod === 'CREDIT_CARD' ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                padding: '1.2rem',
                borderRadius: '12px',
                background: paymentMethod === 'CREDIT_CARD' ? 'rgba(223, 186, 82, 0.12)' : 'rgba(0,0,0,0.2)'
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
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CreditCard size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span>Cartão de Crédito — R$ 490,00</span>
                </span>
                <span style={{ fontSize: '0.82rem', color: '#ffeca8', fontWeight: 600 }}>Em até 10x de R$ 49,00 sem juros</span>
              </div>
            </label>
          </div>

          {/* Seletor de Parcelas caso Cartão de Crédito */}
          {paymentMethod === 'CREDIT_CARD' && (
            <div style={{
              background: 'rgba(223, 186, 82, 0.08)',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              padding: '1.2rem',
              marginTop: '1rem'
            }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>
                Escolha o Número de Parcelas (Sem Juros) *
              </label>
              <select
                value={installments}
                onChange={e => setInstallments(Number(e.target.value))}
                className="input-field"
                style={{ background: '#0a0f1e', color: '#fff', fontWeight: 600, fontSize: '1rem' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                  const val = (totalAmount / n).toFixed(2).replace('.', ',');
                  return (
                    <option key={n} value={n}>
                      {n === 1 
                        ? `1x de R$ ${totalAmount.toFixed(2).replace('.', ',')} à vista (Sem juros)` 
                        : `${n}x de R$ ${val} sem juros`}
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem', display: 'block' }}>
                Parcelamento oficial sem acréscimo processado pela plataforma Asaas.
              </span>
            </div>
          )}
        </section>

        {/* Resumo Final e Botão de Ação */}
        <div className="glass-panel text-center" style={{ padding: '2rem', border: '1px solid var(--primary)' }}>
          <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>Total da Compra:</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                R$ {totalAmount.toFixed(2).replace('.', ',')}
              </div>
              
              {paymentMethod === 'CREDIT_CARD' && (
                <span style={{ fontSize: '0.95rem', color: '#ffeca8', fontWeight: 700, display: 'block', marginTop: '0.3rem' }}>
                  {installments > 1 
                    ? `Parcelamento: ${installments}x de R$ ${(totalAmount / installments).toFixed(2).replace('.', ',')} sem juros` 
                    : 'Pagamento em 1x à vista sem juros'}
                </span>
              )}

              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: '0.2rem' }}>
                {quantity} {quantity > 1 ? 'credenciais nominais' : 'credencial nominal'}
                {countKits > 0 && ` • ${countKits}x Kit 30 Anos`}
                {countBuffets > 0 && ` • ${countBuffets}x Almoço Buffet`}
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: '1.2rem', padding: '1.2rem 2.5rem', minWidth: '280px' }}
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