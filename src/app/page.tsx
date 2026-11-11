'use client';
import Link from 'next/link';
import { 
  Shield, BookOpen, GraduationCap, Award, CheckCircle2, MapPin, 
  Calendar, X, Ticket, Coffee, Mic, ChevronLeft, ChevronRight, 
  UtensilsCrossed, CreditCard, Sparkles, Navigation, Droplets, ExternalLink, Check
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginCpf, setLoginCpf] = useState('');

  // Opcionais selecionados na Home
  const [includeKit, setIncludeKit] = useState(false);
  const [includeBuffet, setIncludeBuffet] = useState(false);

  // Galeria de Fotos do Kit
  const [activeKitIndex, setActiveKitIndex] = useState(0);
  const kitImages = [
    { src: '/kit-vip/Asset 1.png', title: 'Kit Oficial Completo 30 Anos', desc: 'Conjunto comemorativo oficial de alto padrão' },
    { src: '/kit-vip/Asset 2.png', title: 'Caderno Moleskine & Caneta', desc: 'Acabamento premium exclusivo' },
    { src: '/kit-vip/Asset 3.png', title: 'Caneca Institucional 30 Anos', desc: 'Porcelana nobre comemorativa' },
    { src: '/kit-vip/Asset 4.png', title: 'Botton Metálico Oficial', desc: 'Insígnia dourada de distinção' },
    { src: '/kit-vip/Asset 5.png', title: 'Chaveiro Oficial em Metal', desc: 'Metal dourado gravado a laser' },
    { src: '/kit-vip/Asset 6.png', title: 'Suporte de Celular', desc: 'Design ergonômico institucional' },
    { src: '/kit-vip/Asset 7.png', title: 'Cordão & Crachá Especial', desc: 'Crachá de gala e cordão personalizado' }
  ];

  // Galeria de Fotos do Local (Versá Restaurante & Eventos)
  const [activeVenueIndex, setActiveVenueIndex] = useState(0);
  const venueImages = [
    { 
      src: '/versa-salao-1.jpg', 
      title: 'Salão Nobre do Evento — Versá', 
      desc: 'Salão climatizado de alto padrão, equipado com mesas redondas, acústica profissional e iluminação cênica' 
    },
    { 
      src: '/versa-foyer.jpg', 
      title: 'Foyer Nobre de Recepção & Credenciamento', 
      desc: 'Espaço amplo para recepção solene, entrega de credenciais, certificados e networking institucional' 
    },
    { 
      src: '/versa-salao-2.jpg', 
      title: 'Ambiente Panorâmico & Mesas do Seminário', 
      desc: 'Infraestrutura completa com visão privilegiada do palco oficial e conforto térmico de última geração' 
    },
    { 
      src: '/versa-salao-3.jpg', 
      title: 'Espaço Corporativo & Estações de Café', 
      desc: 'Amplo espaço corporativo com estações permanentes de água mineral e café quente durante todo o dia' 
    }
  ];

  // Auto-play suave dos carrosséis
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveKitIndex(prev => (prev + 1) % kitImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [kitImages.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVenueIndex(prev => (prev + 1) % venueImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [venueImages.length]);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerPassword, setBuyerPassword] = useState('');
  const [cpfExists, setCpfExists] = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);

  // Preços
  const BASE_PRICE = 490.00;
  const KIT_PRICE = 109.90;
  const BUFFET_PRICE = 139.90;
  const totalPreview = BASE_PRICE + (includeKit ? KIT_PRICE : 0) + (includeBuffet ? BUFFET_PRICE : 0);
  const installmentValue = (totalPreview / 10).toFixed(2).replace('.', ',');

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
      ticketType: 'UNICO',
      hasKit: includeKit,
      hasBuffet: includeBuffet
    };
    
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
        <header className="flex flex-col items-center justify-center text-center hero-section animate-fade-up" style={{ padding: '3.5rem 0 3rem' }}>
          
          {/* Logos Section */}
          <div 
            className="flex gap-4 items-center justify-center animate-fade-in delay-100 mobile-col" 
            style={{ marginBottom: '2.5rem', width: '100%', maxWidth: '580px' }}
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

          <p style={{ textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.88rem' }}>
            Convite Especial Oficial • 30 Anos de Arbitragem
          </p>
          <h1 className="gold-gradient-text animate-fade-in delay-100" style={{ fontSize: '3.1rem', marginBottom: '0.8rem', lineHeight: '1.15', letterSpacing: '0.5px' }}>
            Seminário Nacional
          </h1>
          <h2 className="animate-fade-in delay-200" style={{ fontSize: '1.75rem', marginBottom: '1.4rem', fontWeight: 600, letterSpacing: '0.3px', color: '#fff', maxWidth: '850px' }}>
            Em comemoração aos 30 anos da Arbitragem e Mediação no Brasil
          </h2>
          <div className="animate-fade-in delay-300" style={{ maxWidth: '820px', margin: '0 auto 2.2rem', lineHeight: 1.75 }}>
            <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.92)', marginBottom: '0.8rem', fontWeight: 500 }}>
              Uma celebração majestosa de três décadas de pioneirismo, segurança jurídica e pacificação de conflitos no país.
            </p>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.72)', margin: '0 auto' }}>
              Magistrados, árbitros, mediadores, advogados e lideranças institucionais reunidos no mais sofisticado complexo corporativo e gastronômico do DF para um dia histórico de debates sobre o futuro da justiça multiportas.
            </p>
          </div>
          
          {/* Data e Local Oficiais Atualizados */}
          <div className="flex gap-6 items-center justify-center mobile-col animate-fade-up delay-300" style={{ marginBottom: '2.5rem', width: '100%', maxWidth: '850px' }}>
            <div className="glass-panel flex flex-col items-center justify-center text-center" style={{ flex: 1, padding: '1.8rem 1.4rem', border: '1px solid rgba(223, 186, 82, 0.35)' }}>
              <Calendar color="var(--primary)" size={36} style={{ marginBottom: '1rem' }} />
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>Data Oficial</span>
              <strong style={{ fontSize: '1.35rem', marginTop: '0.2rem', color: '#fff' }}>01 de Dezembro de 2026</strong>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem', color: '#ffeca8', fontWeight: 600 }}>Terça-feira • 09h às 18h</p>
            </div>
            <div className="glass-panel flex flex-col items-center justify-center text-center" style={{ flex: 1, padding: '1.8rem 1.4rem', border: '1px solid rgba(223, 186, 82, 0.35)' }}>
              <MapPin color="var(--primary)" size={36} style={{ marginBottom: '1rem' }} />
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700 }}>Local do Evento</span>
              <strong style={{ fontSize: '1.35rem', marginTop: '0.2rem', color: '#fff' }}>Versá Restaurante & Eventos</strong>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                SIBS Qd. 2, Cj. B, Lts. 3/5 • Núcleo Bandeirante, DF
              </p>
            </div>
          </div>

          {/* Destaque das Facilidades Inclusas */}
          <div 
            className="flex flex-wrap items-center justify-center gap-4 animate-fade-up delay-350"
            style={{ width: '100%', maxWidth: '850px', marginBottom: '2.2rem' }}
          >
            <div style={{ background: 'rgba(223, 186, 82, 0.12)', border: '1px solid var(--primary)', borderRadius: '30px', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#ffeca8', fontWeight: 600 }}>
              <Droplets size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>Água e Café Quente à vontade o dia todo</span>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '30px', padding: '0.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
              <CreditCard size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>Até 10x sem Juros no Cartão ou PIX</span>
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
          <div className="flex gap-6 mobile-col animate-fade-up delay-400" style={{ width: '100%', maxWidth: '850px', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Link 
              href="#ingresso-unico" 
              className="btn-primary" 
              style={{ 
                flex: 1, 
                padding: '1.05rem 2rem', 
                fontSize: '1.05rem', 
                whiteSpace: 'nowrap', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              Garantir Ingresso Único (R$ 490)
            </Link>
            <button 
              onClick={() => setLoginModalOpen(true)} 
              className="btn-secondary" 
              style={{ 
                flex: 1, 
                padding: '1.05rem 1.8rem', 
                fontSize: '1.05rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.75rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Ticket size={20} style={{ flexShrink: 0 }} />
              <span>Acessar Meu Ingresso</span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* SEÇÃO DO LOCAL DO EVENTO: VERSÁ RESTAURANTE & EVENTOS */}
        {/* ======================================================== */}
        <section className="glass-panel animate-fade-up delay-200" style={{ 
          maxWidth: '850px', 
          margin: '0 auto 3rem', 
          padding: '2.5rem', 
          border: '1px solid rgba(223, 186, 82, 0.4)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 800 }}>
              Estrutura de Alto Padrão
            </span>
            <h3 style={{ fontSize: '2.1rem', color: '#fff', margin: '0.3rem 0 0.6rem' }}>
              Versá Restaurante & Eventos
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', maxWidth: '680px', margin: '0 auto' }}>
              Um dos complexos corporativos e gastronômicos mais modernos do Distrito Federal, com mais de 6.400 m² distribuídos em 4 pavimentos no Núcleo Bandeirante.
            </p>
          </div>

          {/* Showcase de Fotos do Versá */}
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(223, 186, 82, 0.3)',
            borderRadius: '16px',
            padding: '1.2rem',
            marginBottom: '1.8rem',
            position: 'relative'
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.8rem' }}>
              <strong style={{ fontSize: '1.05rem', color: '#ffeca8' }}>
                {venueImages[activeVenueIndex].title}
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                {activeVenueIndex + 1} de {venueImages.length}
              </span>
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '340px',
              borderRadius: '14px',
              overflow: 'hidden',
              background: '#040812',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src={venueImages[activeVenueIndex].src} 
                alt={venueImages[activeVenueIndex].title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'opacity 0.4s ease'
                }}
              />

              <button
                type="button"
                onClick={() => setActiveVenueIndex(prev => (prev === 0 ? venueImages.length - 1 : prev - 1))}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid var(--primary)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  zIndex: 2
                }}
                aria-label="Foto anterior"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                type="button"
                onClick={() => setActiveVenueIndex(prev => (prev === venueImages.length - 1 ? 0 : prev + 1))}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid var(--primary)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  zIndex: 2
                }}
                aria-label="Próxima foto"
              >
                <ChevronRight size={22} />
              </button>

              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                padding: '1.2rem 1.2rem 0.8rem',
                color: '#fff',
                fontSize: '0.9rem'
              }}>
                {venueImages[activeVenueIndex].desc}
              </div>
            </div>

            {/* Miniaturas das Fotos */}
            <div className="flex gap-2 justify-center flex-wrap" style={{ marginTop: '0.9rem' }}>
              {venueImages.map((img, idx) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setActiveVenueIndex(idx)}
                  style={{
                    width: '65px',
                    height: '50px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: activeVenueIndex === idx ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.2)',
                    opacity: activeVenueIndex === idx ? 1 : 0.6,
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img src={img.src} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Dados de Endereço e Comodidades */}
          <div className="grid grid-cols-2 gap-4 mobile-col" style={{ marginBottom: '1.6rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3" style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                <MapPin size={18} style={{ flexShrink: 0 }} />
                <span>Endereço Completo</span>
              </div>
              <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'block' }}>
                SIBS Quadra 2, Conjunto B, Lotes 3/5
              </strong>
              <p style={{ margin: '0.3rem 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                Setor de Indústria Bernardo Sayão — Núcleo Bandeirante, Brasília / DF • CEP: 71736-202
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.2rem', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3" style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                <Sparkles size={18} style={{ flexShrink: 0 }} />
                <span>Estrutura & Comodidades</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                <li>Salão de convenções no 2º pavimento com acústica profissional</li>
                <li>Estacionamento privativo para participantes</li>
                <li>Acessibilidade integral e elevadores nos 4 pavimentos</li>
                <li>Fácil acesso pela EPNB e via Bernardo Sayão</li>
              </ul>
            </div>
          </div>

          {/* Botões de Rota no Google Maps e Waze */}
          <div className="flex gap-4 mobile-col justify-center">
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Vers%C3%A1+Restaurante+e+Eventos+SIBS+Quadra+2+Nucleo+Bandeirante+Brasilia" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ flex: 1, padding: '0.95rem 1.4rem', fontSize: '0.95rem', gap: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Navigation size={18} style={{ flexShrink: 0 }} />
              <span>Ver no Google Maps</span>
            </a>
            <a 
              href="https://waze.com/ul?q=Vers%C3%A1+Restaurante+e+Eventos+Nucleo+Bandeirante" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ flex: 1, padding: '0.95rem 1.4rem', fontSize: '0.95rem', gap: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ExternalLink size={18} style={{ flexShrink: 0 }} />
              <span>Abrir no Waze</span>
            </a>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD PRINCIPAL: INGRESSO ÚNICO OFICIAL (R$ 490,00) */}
        {/* ======================================================== */}
        <div id="ingresso-unico" style={{ maxWidth: '850px', margin: '0 auto 2.5rem' }}>
          <div 
            className="glass-panel animate-fade-up"
            style={{ 
              border: '2px solid var(--primary)',
              background: 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.16), rgba(4, 8, 18, 0.96))',
              boxShadow: '0 0 50px rgba(223, 186, 82, 0.28)',
              padding: '2.5rem',
              borderRadius: '20px',
              position: 'relative'
            }}
          >
            <div className="flex items-center justify-between mobile-col gap-3" style={{ marginBottom: '1.2rem' }}>
              <div className="flex items-center gap-2">
                <span style={{ 
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', 
                  color: '#040812',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  padding: '0.3rem 0.9rem',
                  borderRadius: '20px'
                }}>
                  ★ INGRESSO ÚNICO OFICIAL
                </span>
                <span style={{ 
                  background: 'rgba(74, 222, 128, 0.15)', 
                  border: '1px solid #4ade80',
                  color: '#4ade80',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px'
                }}>
                  Lote Exclusivo
                </span>
              </div>
              <span style={{ fontSize: '0.9rem', color: '#ffeca8', fontWeight: 600 }}>
                Terça, 01.12.2026 • 09h às 18h
              </span>
            </div>

            <div className="flex items-baseline justify-between mobile-col gap-4" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(223, 186, 82, 0.25)', paddingBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '2.2rem', color: '#fff', margin: 0, lineHeight: 1.2 }}>
                  Seminário Nacional 30 Anos
                </h3>
                <p style={{ margin: '0.4rem 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>
                  Acesso integral a todas as conferências solenes, mesa diretora e debates.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                  R$ 490,00
                </div>
                <span style={{ fontSize: '0.95rem', color: '#ffeca8', fontWeight: 700, display: 'block', marginTop: '0.3rem' }}>
                  ou em até 10x de R$ 49,00 sem juros
                </span>
              </div>
            </div>

            {/* O QUE ESTÁ INCLUSO NO INGRESSO ÚNICO */}
            <div style={{ marginBottom: '1.8rem' }}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 800, display: 'block', marginBottom: '1rem' }}>
                Itens Inclusos no seu Ingresso:
              </span>

              <div className="grid grid-cols-2 gap-4 mobile-col">
                <div className="flex items-start gap-3">
                  <div className="icon-badge" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                    <Award color="var(--primary)" size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block' }}>Entrega de Certificados Oficiais</strong>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Certificado institucional com carga horária completa</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="icon-badge" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                    <Shield color="var(--primary)" size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block' }}>Credencial Oficial do Evento</strong>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Identificação solene de participante</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="icon-badge" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                    <BookOpen color="var(--primary)" size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block' }}>Apostila Oficial do Evento</strong>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Material didático de apoio encadernado</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="icon-badge" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                    <GraduationCap color="var(--primary)" size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block' }}>E-book Digital Exclusivo</strong>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Obra doutrinária comemorativa dos 30 anos</span>
                  </div>
                </div>

                {/* Destaque Café Quente e Água Mineral */}
                <div className="flex items-start gap-3" style={{ gridColumn: 'span 2' }}>
                  <div className="icon-badge" style={{ width: '36px', height: '36px', flexShrink: 0, background: 'rgba(223, 186, 82, 0.25)' }}>
                    <Coffee color="var(--primary)" size={18} />
                  </div>
                  <div>
                    <strong style={{ color: '#ffeca8', fontSize: '1rem', display: 'block' }}>
                      Água Mineral e Café Quente à Vontade o Dia Todo
                    </strong>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem' }}>
                      Estações permanentes de café de alta qualidade e água disponíveis durante todo o evento (09h às 18h).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Link 
              href="#comprar" 
              className="btn-primary btn-full"
              style={{ padding: '1.2rem', fontSize: '1.15rem', textAlign: 'center', justifyContent: 'center' }}
            >
              Garantir Minha Vaga — R$ 490,00 (Até 10x sem Juros)
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO DE OPCIONAIS A PARTE: KIT 30 ANOS & ALMOÇO BUFFET */}
        {/* ======================================================== */}
        <div style={{ maxWidth: '850px', margin: '0 auto 3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
            <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 800 }}>
              Personalize sua Experiência
            </span>
            <h3 style={{ fontSize: '2rem', color: '#fff', margin: '0.3rem 0 0.5rem' }}>
              Opcionais Disponíveis à Parte
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
              Você pode adicionar o Kit Oficial e o Almoço Buffet Completo durante a sua inscrição.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mobile-col">
            
            {/* OPCIONAL 1: KIT OFICIAL COMEMORATIVO (R$ 109,90) */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.8rem', 
                border: includeKit ? '2px solid var(--primary)' : '1px solid rgba(223, 186, 82, 0.3)',
                background: includeKit ? 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.18), rgba(4, 8, 18, 0.95))' : 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#ffeca8', fontWeight: 800 }}>
                    Opcional à Parte
                  </span>
                  <span style={{ 
                    background: 'rgba(223, 186, 82, 0.2)', 
                    border: '1px solid var(--primary)', 
                    color: '#ffeca8', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px' 
                  }}>
                    Colecionador
                  </span>
                </div>

                <h4 style={{ fontSize: '1.45rem', color: '#fff', marginBottom: '0.3rem' }}>
                  Kit Oficial 30 Anos
                </h4>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.8rem', lineHeight: 1 }}>
                  R$ 109,90
                </div>

                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', marginBottom: '1.2rem' }}>
                  Conjunto comemorativo oficial de alto padrão com peças personalizadas:
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Caderno Moleskine com caneta luxo</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Caneca de porcelana comemorativa 30 anos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Botton metálico oficial esmaltado</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Chaveiro comemorativo em metal dourado</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Suporte anatômico de celular</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Cordão VIP e crachá comemorativo</span>
                  </li>
                </ul>

                {/* Mini Carrossel do Kit */}
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '0.8rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={kitImages[activeKitIndex].src} 
                      alt={kitImages[activeKitIndex].title}
                      style={{ maxHeight: '130px', maxWidth: '85%', objectFit: 'contain' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#ffeca8', fontWeight: 600, display: 'block', marginTop: '0.4rem' }}>
                    {kitImages[activeKitIndex].title}
                  </span>
                </div>
              </div>

              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.6rem', 
                  padding: '0.85rem', 
                  borderRadius: '10px', 
                  background: includeKit ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: includeKit ? '#000' : '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={includeKit} 
                  onChange={(e) => setIncludeKit(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                />
                {includeKit ? '✓ Kit 30 Anos Adicionado' : '+ Adicionar Kit (+ R$ 109,90)'}
              </label>
            </div>

            {/* OPCIONAL 2: ALMOÇO BUFFET COMPLETO (R$ 139,90) */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1.8rem', 
                border: includeBuffet ? '2px solid var(--primary)' : '1px solid rgba(223, 186, 82, 0.3)',
                background: includeBuffet ? 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.18), rgba(4, 8, 18, 0.95))' : 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#ffeca8', fontWeight: 800 }}>
                    Opcional à Parte
                  </span>
                  <span style={{ 
                    background: 'rgba(223, 186, 82, 0.2)', 
                    border: '1px solid var(--primary)', 
                    color: '#ffeca8', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px' 
                  }}>
                    Gastronomia Versá
                  </span>
                </div>

                <h4 style={{ fontSize: '1.45rem', color: '#fff', marginBottom: '0.3rem' }}>
                  Almoço Buffet Completo
                </h4>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.8rem', lineHeight: 1 }}>
                  R$ 139,90
                </div>

                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', marginBottom: '1.2rem' }}>
                  Experiência gastronômica premiada servida no restaurante do Versá:
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Parrilla assistida com cortes nobres ao vivo</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Ilha completa de antepastos e frios selecionados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Saladas finas e guarnições especiais</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Massas e pratos quentes assinados pelo chef</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Sobremesas da casa e bebidas no almoço</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>Comodidade de almoçar no local sem deslocamentos</span>
                  </li>
                </ul>

                {/* Mini Foto do Buffet */}
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: '1rem',
                  height: '140px'
                }}>
                  <img 
                    src="/versa-buffet.jpg" 
                    alt="Buffet Completo do Versá"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>

              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.6rem', 
                  padding: '0.85rem', 
                  borderRadius: '10px', 
                  background: includeBuffet ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                  color: includeBuffet ? '#000' : '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={includeBuffet} 
                  onChange={(e) => setIncludeBuffet(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#000', cursor: 'pointer' }}
                />
                {includeBuffet ? '✓ Almoço Buffet Adicionado' : '+ Adicionar Almoço (+ R$ 139,90)'}
              </label>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* FORMULÁRIO DE INSCRIÇÃO / CHECKOUT */}
        {/* ======================================================== */}
        <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
          <section id="comprar" className="glass-panel" style={{ border: '1px solid var(--primary)', boxShadow: '0 0 40px rgba(223, 186, 82, 0.15)', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--primary)', fontWeight: 800 }}>
                Inscrição Imediata
              </span>
              <h3 style={{ fontSize: '1.9rem', color: '#fff', margin: '0.2rem 0 0.4rem' }}>
                Preencha seus Dados para Inscrição
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                Pagamento seguro processado pelo Asaas via PIX ou em até 10x sem juros no Cartão.
              </p>
            </div>
            
            <form className="flex flex-col" onSubmit={handleStepToSelectTickets}>
              
              {/* Resumo do Pedido no Formulário */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(223, 186, 82, 0.3)',
                borderRadius: '12px',
                padding: '1.2rem',
                marginBottom: '1.5rem'
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.6rem' }}>
                  <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                    Ingresso Oficial (Certificados + Apostila + E-book + Café/Água o dia todo)
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>
                    R$ 490,00
                  </span>
                </div>

                {includeKit && (
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffeca8' }}>
                    <span>+ Kit Comemorativo 30 Anos (Moleskine, Caneca, Botton, Chaveiro, Suporte, Cordão)</span>
                    <span style={{ fontWeight: 700 }}>+ R$ 109,90</span>
                  </div>
                )}

                {includeBuffet && (
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.4rem', fontSize: '0.88rem', color: '#ffeca8' }}>
                    <span>+ Almoço Buffet Completo no Versá (Parrilla assistida, saladas, pratos quentes e sobremesas)</span>
                    <span style={{ fontWeight: 700 }}>+ R$ 139,90</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: 600 }}>Total Previsto:</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                      R$ {totalPreview.toFixed(2).replace('.', ',')}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#ffeca8', fontWeight: 600 }}>
                      em até 10x de R$ {installmentValue} sem juros
                    </span>
                  </div>
                </div>
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
                        Identificamos seu cadastro anterior. Deseja acessar suas credenciais existentes?
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
                    WhatsApp / Telefone *
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
                  Avançar para Selecionar Quantidade →
                </span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  opacity: 0.95, 
                  letterSpacing: '0.5px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.2rem 0.8rem',
                  borderRadius: '20px',
                  display: 'inline-block'
                }}>
                  Total: R$ {totalPreview.toFixed(2).replace('.', ',')} • Em até 10x de R$ {installmentValue} sem juros ou PIX
                </span>
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.6rem' }}>
                Na próxima etapa você define a quantidade de ingressos e participantes.
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
              <input 
                type="text" 
                name="cpf" 
                placeholder="CPF ou E-mail" 
                defaultValue={loginCpf}
                className="input-field" 
                required 
              />
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