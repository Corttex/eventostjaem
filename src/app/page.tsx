'use client';
import Link from 'next/link';
import { Shield, BookOpen, GraduationCap, Award, CheckCircle2, MapPin, Calendar, X, Ticket, Coffee, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginCpf, setLoginCpf] = useState('');

  // Formulário e Seleção de Ingresso (ESTUDANTE, PADRAO ou VIP)
  const [selectedTicketType, setSelectedTicketType] = useState<'ESTUDANTE' | 'PADRAO' | 'VIP'>('PADRAO');
  const [activeKitIndex, setActiveKitIndex] = useState(0);

  const kitImages = [
    { src: '/kit-vip/Asset 1.png', title: 'Kit VIP Completo', desc: 'Conjunto comemorativo oficial' },
    { src: '/kit-vip/Asset 2.png', title: 'Caderno Moleskine & Caneta', desc: 'Acabamento premium exclusivo' },
    { src: '/kit-vip/Asset 3.png', title: 'Caneca Institucional', desc: 'Porcelana comemorativa 30 anos' },
    { src: '/kit-vip/Asset 4.png', title: 'Botton Metálico', desc: 'Insígnia oficial do evento' },
    { src: '/kit-vip/Asset 5.png', title: 'Chaveiro Oficial', desc: 'Metal dourado gravado' },
    { src: '/kit-vip/Asset 6.png', title: 'Suporte de Celular', desc: 'Design anatômico institucional' },
    { src: '/kit-vip/Asset 7.png', title: 'Cordão & Crachá Especial', desc: 'Acesso VIP antecipado às 08h' }
  ];

  // Auto-play suave do carrossel a cada 3.5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveKitIndex(prev => (prev + 1) % kitImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [kitImages.length]);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerPassword, setBuyerPassword] = useState('');
  const [cpfExists, setCpfExists] = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);

  // Verificar se CPF já tem cadastro ao digitar/sair do campo
  const handleCpfBlur = async () => {
    const cleanCpf = buyerCpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      setCheckingCpf(true);
      try {
        const res = await fetch('/api/check-cpf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf: cleanCpf })
        });
        const data = await res.json();
        if (data.exists) {
          setCpfExists(true);
          if (data.user) {
            if (!buyerName) setBuyerName(data.user.name || '');
            if (!buyerEmail) setBuyerEmail(data.user.email || '');
            if (!buyerPhone) setBuyerPhone(data.user.phone || '');
          }
        } else {
          setCpfExists(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingCpf(false);
      }
    }
  };

  const handleStepToSelectTickets = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: buyerName,
      email: buyerEmail,
      cpf: buyerCpf,
      phone: buyerPhone,
      password: buyerPassword,
      ticketType: selectedTicketType
    };
    
    // Salvar dados do comprador e tipo de ingresso na sessão
    sessionStorage.setItem('tjaem_buyer_data', JSON.stringify(data));
    router.push('/selecionar-ingressos');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      
      const res = await fetch('/api/auth-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        window.location.href = `/sucesso/${result.paymentId || result.ticketId}`;
      } else {
        alert(`${result.error}${result.details ? ': ' + result.details : ''}`);
      }
    } catch (error) {
      alert('Erro de conexão.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <main className="container" style={{ paddingBottom: '5rem', overflow: 'hidden' }}>
        <header className="flex flex-col items-center justify-center text-center hero-section animate-fade-up" style={{ padding: '4rem 0 4rem' }}>
          
          {/* Logos Section */}
          <div 
            className="flex gap-4 items-center justify-center animate-fade-in delay-100 mobile-col" 
            style={{ marginBottom: '3rem', width: '100%', maxWidth: '580px' }}
          >
            <div 
              className="glass-panel flex items-center justify-center" 
              style={{ flex: 1, padding: '1rem', borderRadius: '18px', minHeight: '110px' }}
            >
              <img 
                src="/logo-tjaem.png" 
                alt="Logo TJAEM Brasil" 
                style={{ height: '85px', objectFit: 'contain' }} 
              />
            </div>

            <div style={{ color: 'var(--primary)', opacity: 0.5 }} className="hidden-mobile">
              <span style={{ fontSize: '1.25rem' }}>&</span>
            </div>

            <div 
              className="flex items-center justify-center" 
              style={{ 
                flex: 1, 
                padding: '1.2rem 1.6rem', 
                borderRadius: '18px', 
                background: '#ffffff',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.35)',
                minHeight: '110px'
              }}
            >
              <img 
                src="/logo-cameb.png" 
                alt="Logo CAMEB Brasil" 
                style={{ height: '70px', maxWidth: '100%', objectFit: 'contain' }} 
              />
            </div>
          </div>

          <p style={{ textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '1.2rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.9rem' }}>
            Convite Especial Oficial
          </p>
          <h1 className="gold-gradient-text animate-fade-in delay-100" style={{ fontSize: '3.2rem', marginBottom: '0.8rem', lineHeight: '1.2', letterSpacing: '1px' }}>
            Seminário Nacional
          </h1>
          <h2 className="animate-fade-in delay-200" style={{ fontSize: '1.85rem', marginBottom: '1.5rem', fontWeight: 600, letterSpacing: '0.5px', color: '#fff', maxWidth: '850px' }}>
            Em comemoração aos 30 anos da Arbitragem e Mediação no Brasil
          </h2>
          <div className="animate-fade-in delay-300" style={{ maxWidth: '820px', margin: '0 auto 2.5rem', lineHeight: 1.8 }}>
            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', marginBottom: '1rem', fontWeight: 500 }}>
              Uma oportunidade majestosa para celebrar três décadas de evolução dos métodos de solução de conflitos, diálogo e segurança jurídica no país.
            </p>
            <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.72)', margin: '0 auto' }}>
              Este encontro solene reúne magistrados, juristas, árbitros e líderes institucionais para homenagear os avanços trazidos pela Lei Federal nº 9.307/1996. Venha prestigiar palestras e debates de alto nível sobre a consolidação da arbitragem e mediação, o fortalecimento dos negócios e as novas perspectivas da justiça multiportas no Brasil.
            </p>
          </div>
          
          {/* Data e Local - Somente Ícones com Espaçamento Amplo */}
          <div className="flex gap-6 items-center justify-center mobile-col animate-fade-up delay-300" style={{ marginBottom: '2.5rem', width: '100%', maxWidth: '850px' }}>
            <div className="glass-panel flex flex-col items-center justify-center text-center" style={{ flex: 1, padding: '2rem 1.5rem' }}>
              <Calendar color="var(--primary)" size={36} style={{ marginBottom: '1.2rem' }} />
              <strong style={{ fontSize: '1.3rem', marginTop: '0.2rem', color: '#fff' }}>28 de Novembro de 2026</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)' }}>Sábado • 9h às 16h (6h totais com intervalo de almoço)</p>
            </div>
            <div className="glass-panel flex flex-col items-center justify-center text-center" style={{ flex: 1, padding: '2rem 1.5rem' }}>
              <MapPin color="var(--primary)" size={36} style={{ marginBottom: '1.2rem' }} />
              <strong style={{ fontSize: '1.3rem', marginTop: '0.2rem', color: '#fff' }}>LBV — Asa Sul, Brasília / DF</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)' }}>Parlamundi da LBV • SGAS 915 / 603 Sul, L2 Sul</p>
            </div>
          </div>

          {/* Seção Palestrantes */}
          <div className="glass-panel animate-fade-up delay-400" style={{ width: '100%', maxWidth: '850px', marginBottom: '2.5rem', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '1.8rem', textAlign: 'center', display: 'inline-block', borderBottom: '2px solid var(--primary)', paddingBottom: '0.4rem' }}>
              Palestrantes Oficiais
            </h3>
            
            <div className="grid grid-cols-3 gap-6 mobile-col" style={{ marginTop: '0.5rem' }}>
              <div style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(223, 186, 82, 0.08)', border: '1px solid rgba(223, 186, 82, 0.3)', textAlign: 'center' }}>
                <div className="icon-badge" style={{ width: '44px', height: '44px', margin: '0 auto 0.8rem' }}>
                  <Mic color="var(--primary)" size={22} />
                </div>
                <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600 }}>Palestrante</p>
                <strong style={{ fontSize: '1.2rem', color: '#fff', display: 'block', marginTop: '0.3rem' }}>Dr. Thiago Borges</strong>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.3rem', display: 'block' }}>Árbitro e Doutorando em Processo</span>
              </div>

              <div style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(223, 186, 82, 0.08)', border: '1px solid rgba(223, 186, 82, 0.3)', textAlign: 'center' }}>
                <div className="icon-badge" style={{ width: '44px', height: '44px', margin: '0 auto 0.8rem' }}>
                  <Mic color="var(--primary)" size={22} />
                </div>
                <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600 }}>Palestrante</p>
                <strong style={{ fontSize: '1.2rem', color: '#fff', display: 'block', marginTop: '0.3rem' }}>Dra. Liciane Matoso</strong>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.3rem', display: 'block' }}>Especialista em Mediação Civil</span>
              </div>

              <div style={{ padding: '1.2rem', borderRadius: '14px', background: 'rgba(223, 186, 82, 0.08)', border: '1px solid rgba(223, 186, 82, 0.3)', textAlign: 'center' }}>
                <div className="icon-badge" style={{ width: '44px', height: '44px', margin: '0 auto 0.8rem' }}>
                  <Mic color="var(--primary)" size={22} />
                </div>
                <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600 }}>Palestrante</p>
                <strong style={{ fontSize: '1.2rem', color: '#fff', display: 'block', marginTop: '0.3rem' }}>Dr. Danilo Ribeiro</strong>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.3rem', display: 'block' }}>Jurista em Arbitragem e Agronegócio</span>
              </div>
            </div>
          </div>

          {/* Mesa Diretora (Presidente e 10 Convidados Especiais) */}
          <div className="glass-panel animate-fade-up delay-400" style={{ width: '100%', maxWidth: '850px', marginBottom: '2.5rem', padding: '2.2rem' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', textAlign: 'center', display: 'inline-block', borderBottom: '2px solid var(--primary)', paddingBottom: '0.4rem' }}>
              Mesa Diretora
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '1.8rem', textAlign: 'center' }}>
              Composição solene da Mesa Diretora com a Presidência e 10 Convidados Especiais de Honra.
            </p>
            
            {/* Presidente da Mesa */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(223, 186, 82, 0.22), rgba(4, 8, 18, 0.85))', 
              border: '2px solid var(--primary)', 
              borderRadius: '16px', 
              padding: '1.8rem 1.5rem', 
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(223, 186, 82, 0.2)'
            }}>
              <span style={{ color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '2px', fontWeight: 800 }}>
                ★ Presidente da Mesa Diretora
              </span>
              <strong style={{ fontSize: '1.65rem', color: '#fff', display: 'block', marginTop: '0.35rem' }}>
                Luís Gonçalves Matoso
              </strong>
              <p style={{ margin: '0.3rem 0 0.8rem', fontSize: '0.95rem', color: '#ffeca8', fontWeight: 500 }}>
                Presidente CAMEB & TJAEM Brasil
              </p>
              <div style={{ 
                display: 'inline-block', 
                background: 'rgba(0, 0, 0, 0.4)', 
                border: '1px solid rgba(223, 186, 82, 0.3)', 
                borderRadius: '20px', 
                padding: '0.4rem 1.2rem',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.85)'
              }}>
                Acompanhado por <strong>10 Convidados Especiais de Honra</strong> na solenidade oficial
              </div>
            </div>
          </div>

          {/* Botões alinhados com espaçamento generoso */}
          <div className="flex gap-8 mobile-col animate-fade-up delay-400" style={{ width: '100%', maxWidth: '850px', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Link href="#comprar" className="btn-primary" style={{ flex: 1 }}>
              Garantir Minha Vaga
            </Link>
            <button onClick={() => setLoginModalOpen(true)} className="btn-secondary" style={{ flex: 1, gap: '0.75rem' }}>
              <Ticket size={20} />
              Acessar Meu Ingresso
            </button>
          </div>
        </header>

        {/* Seção Tipos de Ingressos: Estudante e Padrão em 2 Colunas */}
        <div className="grid grid-cols-2 gap-6" style={{ marginBottom: '1.8rem' }}>
          
          {/* 1. Ingresso Estudante de Direito - R$ 150,00 (50 vagas) */}
          <div 
            onClick={() => setSelectedTicketType('ESTUDANTE')}
            className="glass-panel cursor-pointer animate-fade-up delay-100"
            style={{ 
              cursor: 'pointer',
              border: selectedTicketType === 'ESTUDANTE' ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
              background: selectedTicketType === 'ESTUDANTE' ? 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.14), rgba(4, 8, 18, 0.95))' : 'var(--glass-bg)',
              boxShadow: selectedTicketType === 'ESTUDANTE' ? '0 0 35px rgba(223, 186, 82, 0.25)' : 'none',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              outline: 'none',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative'
            }}
          >
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#60a5fa', fontWeight: 700 }}>
                  Acadêmico
                </span>
                <span style={{ 
                  background: 'rgba(96, 165, 250, 0.15)', 
                  border: '1px solid rgba(96, 165, 250, 0.4)',
                  color: '#93c5fd',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px'
                }}>
                  50 Vagas
                </span>
              </div>

              <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.3rem' }}>Estudante de Direito</h3>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', lineHeight: 1 }}>
                R$ 150,00
              </div>

              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.2rem' }}>
                Destinado a graduandos em Direito com comprovação acadêmica:
              </p>

              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <BookOpen color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Apostila Oficial do Evento</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <CheckCircle2 color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Certificado Acadêmico</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <Shield color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Crachá de Estudante</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <GraduationCap color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Diploma c/ Horas Complementares</span>
                </li>
              </ul>
            </div>

            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketType('ESTUDANTE'); }}
              className={selectedTicketType === 'ESTUDANTE' ? 'btn-primary' : 'btn-secondary'}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontSize: '0.9rem' }}
            >
              {selectedTicketType === 'ESTUDANTE' ? '✓ Selecionado' : 'Escolher Estudante (R$ 150)'}
            </button>
          </div>

          {/* 2. Ingresso Padrão - R$ 280,00 (400 vagas) */}
          <div 
            onClick={() => setSelectedTicketType('PADRAO')}
            className="glass-panel cursor-pointer animate-fade-up delay-200"
            style={{ 
              cursor: 'pointer',
              border: selectedTicketType === 'PADRAO' ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.12)',
              background: selectedTicketType === 'PADRAO' ? 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.14), rgba(4, 8, 18, 0.95))' : 'var(--glass-bg)',
              boxShadow: selectedTicketType === 'PADRAO' ? '0 0 35px rgba(223, 186, 82, 0.25)' : 'none',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease',
              outline: 'none',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative'
            }}
          >
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--primary)', fontWeight: 700 }}>
                  Profissional
                </span>
                <span style={{ 
                  background: 'rgba(223, 186, 82, 0.15)', 
                  border: '1px solid var(--primary)',
                  color: '#ffeca8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px'
                }}>
                  400 Vagas
                </span>
              </div>

              <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.3rem' }}>Ingresso Padrão</h3>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem', lineHeight: 1 }}>
                R$ 280,00
              </div>

              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.2rem' }}>
                Acesso integral para advogados, árbitros e profissionais:
              </p>

              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <BookOpen color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Apostila Oficial do Evento</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <CheckCircle2 color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Certificado de Participação</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <Shield color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Crachá de Acesso Exclusivo</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="icon-badge" style={{ width: '32px', height: '32px' }}>
                    <Award color="var(--primary)" size={16} />
                  </div>
                  <span style={{ fontSize: '0.88rem' }}>Diploma com Carga Horária</span>
                </li>
              </ul>
            </div>

            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketType('PADRAO'); }}
              className={selectedTicketType === 'PADRAO' ? 'btn-primary' : 'btn-secondary'}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontSize: '0.9rem' }}
            >
              {selectedTicketType === 'PADRAO' ? '✓ Selecionado' : 'Escolher Padrão (R$ 280)'}
            </button>
          </div>
        </div>

        {/* 3. Ingresso KIT em Baixo (Largura Total) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div 
            onClick={() => setSelectedTicketType('VIP')}
            className="glass-panel cursor-pointer animate-fade-up delay-300"
            style={{ 
              cursor: 'pointer',
              border: selectedTicketType === 'VIP' ? '2px solid var(--primary)' : '1px solid rgba(223, 186, 82, 0.3)',
              background: selectedTicketType === 'VIP' ? 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.2), rgba(4, 8, 18, 0.95))' : 'var(--glass-bg)',
              boxShadow: selectedTicketType === 'VIP' ? '0 0 45px rgba(223, 186, 82, 0.35)' : 'none',
              padding: '2.2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              transition: 'all 0.3s ease',
              outline: 'none',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ffeca8', fontWeight: 800 }}>
                  ★ Experiência VIP + Kit
                </span>
                <span style={{ 
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', 
                  color: '#040812',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.7rem',
                  borderRadius: '20px'
                }}>
                  {selectedTicketType === 'VIP' ? 'SELECIONADO (100 VAGAS)' : '100 VAGAS DISPONÍVEIS'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8 mobile-col">
                <div>
                  <h3 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.4rem' }}>Kit Aniversário 30 Anos</h3>
                  <p style={{ margin: '0 0 0.8rem', color: '#ffeca8', fontSize: '1.05rem', fontWeight: 600 }}>Arbitragem e Mediação no Brasil</p>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1.2rem', lineHeight: 1 }}>
                    R$ 427,00
                  </div>

                  {/* Destaque VIP: Acesso antecipado às 8h com Café da Manhã Exclusivo */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(223, 186, 82, 0.18), rgba(223, 186, 82, 0.05))',
                    border: '1px solid var(--primary)',
                    borderRadius: '12px',
                    padding: '0.95rem 1.1rem',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem'
                  }}>
                    <div className="icon-badge" style={{ width: '42px', height: '42px', background: 'rgba(223, 186, 82, 0.25)' }}>
                      <Coffee color="var(--primary)" size={22} />
                    </div>
                    <div>
                      <strong style={{ color: '#ffeca8', fontSize: '1rem', display: 'block' }}>
                        Acesso Exclusivo às 08h00
                      </strong>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>
                        Café da manhã exclusivo de boas-vindas com a Mesa e Palestrantes.
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
                    Todos os itens do Ingresso Padrão + <strong>Kit Especial Comemorativo</strong>:
                  </p>

                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(223, 186, 82, 0.25)', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: '0.6rem' }}>
                      Itens Inclusos no Kit Oficial:
                    </span>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Caderno Moleskine
                      </li>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Caneca Institucional
                      </li>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Botton Metálico
                      </li>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Suporte Celular
                      </li>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Chaveiro Oficial
                      </li>
                      <li style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--primary)' }}>•</span> Cordão VIP
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-3">
                    <CheckCircle2 color="var(--primary)" size={20} />
                    <span style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)' }}>
                      Apostila + Certificado + Crachá Exclusivo + Diploma
                    </span>
                  </div>
                </div>

                {/* Coluna Direita: Carrossel de Fotos */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

              {/* Carrossel e Galeria do Kit VIP */}
              <div 
                style={{ 
                  background: 'rgba(0,0,0,0.5)', 
                  border: '1px solid rgba(223, 186, 82, 0.3)', 
                  borderRadius: '14px', 
                  padding: '1rem', 
                  marginBottom: '1.2rem',
                  position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>
                    Galeria de Fotos do Kit VIP
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {activeKitIndex + 1} de {kitImages.length}
                  </span>
                </div>

                {/* Display Principal da Imagem Ativa */}
                <div 
                  style={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: '220px', 
                    borderRadius: '16px', 
                    overflow: 'hidden',
                    background: 'radial-gradient(circle, rgba(223, 186, 82, 0.12) 0%, rgba(4, 8, 18, 0.95) 75%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(223, 186, 82, 0.25)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                >
                  <img 
                    src={kitImages[activeKitIndex].src} 
                    alt={kitImages[activeKitIndex].title}
                    style={{ 
                      maxHeight: '190px', 
                      maxWidth: '90%', 
                      objectFit: 'contain',
                      borderRadius: '12px',
                      filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.65))',
                      transition: 'all 0.3s ease'
                    }}
                  />

                  {/* Seta Esquerda */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveKitIndex(prev => (prev === 0 ? kitImages.length - 1 : prev - 1));
                    }}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.65)',
                      border: '1px solid rgba(223, 186, 82, 0.4)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* Seta Direita */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveKitIndex(prev => (prev === kitImages.length - 1 ? 0 : prev + 1));
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.65)',
                      border: '1px solid rgba(223, 186, 82, 0.4)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Fileira de Miniaturas Táteis Clicáveis Centralizada */}
                <div 
                  className="flex gap-2 justify-center flex-wrap" 
                  style={{ 
                    marginTop: '0.85rem', 
                    paddingBottom: '2px',
                    justifyContent: 'center'
                  }}
                >
                  {kitImages.map((img, idx) => (
                    <button
                      key={img.src}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKitIndex(idx);
                      }}
                      style={{
                        flexShrink: 0,
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        border: activeKitIndex === idx ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)',
                        background: activeKitIndex === idx ? 'rgba(223, 186, 82, 0.22)' : 'rgba(0,0,0,0.35)',
                        padding: '3px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: activeKitIndex === idx ? '0 0 10px rgba(223, 186, 82, 0.35)' : 'none',
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none'
                      }}
                      title={img.title}
                    >
                      <img 
                        src={img.src} 
                        alt={img.title} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px', pointerEvents: 'none' }}
                      />
                    </button>
                  ))}
                </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setSelectedTicketType('VIP'); }}
              className={selectedTicketType === 'VIP' ? 'btn-primary' : 'btn-secondary'}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}
            >
              {selectedTicketType === 'VIP' ? '✓ Selecionado (100 Vagas)' : 'Escolher Kit 30 Anos (R$ 427)'}
            </button>
          </div>
        </div>
      </div>

        {/* Formulário de Inscrição */}
        <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
          <section id="comprar" className="glass-panel" style={{ border: '1px solid var(--primary)', boxShadow: '0 0 40px rgba(223, 186, 82, 0.15)', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.9rem', color: '#fff', marginBottom: '0.4rem' }}>
                Preencha seus Dados para Inscrição
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                Escolha o tipo de ingresso e confirme seus dados para avançar.
              </p>
            </div>
            
            <form className="flex flex-col" onSubmit={handleStepToSelectTickets}>
              
              {/* Dropdown com opções de Ingressos */}
              <div style={{ marginBottom: '1.4rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>
                  Tipo de Ingresso Desejado *
                </label>
                <select
                  value={selectedTicketType}
                  onChange={(e) => setSelectedTicketType(e.target.value as 'ESTUDANTE' | 'PADRAO' | 'VIP')}
                  className="input-field"
                  style={{ background: '#0a0f1e', cursor: 'pointer', fontWeight: 600, border: '1px solid var(--primary)' }}
                >
                  <option value="ESTUDANTE" style={{ background: '#0a0f1e', color: '#fff' }}>
                    Ingresso Estudante de Direito (50 vagas) — R$ 150,00
                  </option>
                  <option value="PADRAO" style={{ background: '#0a0f1e', color: '#fff' }}>
                    Ingresso Padrão (400 vagas) — R$ 280,00
                  </option>
                  <option value="VIP" style={{ background: '#0a0f1e', color: '#fff' }}>
                    ★ Kit Aniversário 30 Anos Arbitragem e Mediação (100 vagas com Kit VIP e Café 8h) — R$ 427,00
                  </option>
                </select>
              </div>

              {/* CPF com verificação automática */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', display: 'block', fontWeight: 500 }}>
                    CPF do Responsável *
                  </label>
                  {checkingCpf && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Verificando cadastro...</span>
                  )}
                </div>
                <input 
                  type="text" 
                  name="cpf" 
                  placeholder="000.000.000-00" 
                  className="input-field" 
                  value={buyerCpf}
                  onChange={(e) => setBuyerCpf(e.target.value)}
                  onBlur={handleCpfBlur}
                  required 
                />

                {/* Alerta se o CPF já estiver cadastrado */}
                {cpfExists && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.9rem 1.2rem',
                    background: 'rgba(223, 186, 82, 0.12)',
                    border: '1px solid var(--primary)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem', display: 'block' }}>
                        CPF já cadastrado no sistema!
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                        Identificamos seu cadastro anterior. Deseja acessar seus ingressos existentes?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginCpf(buyerCpf);
                        setLoginModalOpen(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      Fazer Login / Acessar Ingresso →
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                  Nome Completo *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Seu Nome Completo" 
                  className="input-field" 
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                  E-mail *
                </label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="seu.email@exemplo.com" 
                  className="input-field" 
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  required 
                />
              </div>

              <div className="flex gap-4 mobile-col" style={{ marginBottom: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                    WhatsApp *
                  </label>
                  <input 
                    type="tel" 
                    name="phone" 
                    placeholder="(61) 99999-9999" 
                    className="input-field" 
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    required 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.45rem', display: 'block', fontWeight: 500 }}>
                    Senha de Acesso à Credencial
                  </label>
                  <input 
                    type="password" 
                    name="password" 
                    placeholder="Crie uma senha" 
                    className="input-field" 
                    value={buyerPassword}
                    onChange={(e) => setBuyerPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary btn-full" 
                style={{ 
                  padding: '1.1rem 1.5rem', 
                  fontSize: '1.05rem', 
                  marginTop: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  lineHeight: 1.35,
                  minHeight: 'auto',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
              >
                <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>
                  Avançar para Selecionar Ingressos →
                </span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  opacity: 0.9, 
                  letterSpacing: '0.5px',
                  background: 'rgba(0, 0, 0, 0.15)',
                  padding: '0.2rem 0.8rem',
                  borderRadius: '20px',
                  display: 'inline-block'
                }}>
                  {selectedTicketType === 'ESTUDANTE' 
                    ? '🎓 Estudante de Direito • R$ 150,00'
                    : selectedTicketType === 'PADRAO'
                    ? '✓ Ingresso Padrão • R$ 280,00'
                    : '★ Kit Aniversário 30 Anos • R$ 427,00'}
                </span>
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.6rem' }}>
                Na próxima etapa você define a quantidade e dados de cada participante.
              </p>
            </form>
          </section>
        </div>

        {/* Rodapé institucional com link para o portal TJAEM */}
        <footer style={{ marginTop: '5rem', paddingTop: '2.5rem', borderTop: '1px solid rgba(223, 186, 82, 0.2)', textAlign: 'center' }}>
          <div className="flex flex-col items-center justify-center gap-3">
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>
              © 2026 Tribunal de Justiça Arbitral e Mediação do Brasil (TJAEM) & CAMEB. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 items-center justify-center" style={{ marginTop: '0.3rem' }}>
              <a 
                href="https://tjaembrasil.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Acessar Site Oficial TJAEM →
              </a>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
              <a 
                href="https://portal.tjaembrasil.com.br" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
              >
                Portal Jurídico
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Login Modal */}
      {loginModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
            <button 
              onClick={() => setLoginModalOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Ticket color="var(--primary)" size={48} style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.8rem', color: '#fff' }}>Consultar Meus Ingressos</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>Digite seu CPF ou E-mail para visualizar suas credenciais.</p>
            </div>
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <input type="text" name="cpf" placeholder="CPF ou E-mail" className="input-field" required />
              <input type="password" name="password" placeholder="Sua Senha (caso tenha cadastrado)" className="input-field" />
              <button type="submit" className="btn-primary btn-full" style={{ marginTop: '0.5rem', padding: '1.1rem' }} disabled={loginLoading}>
                {loginLoading ? 'Buscando ingressos...' : 'Consultar Meus Ingressos'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
