'use client';
import Link from 'next/link';
import { Shield, BookOpen, GraduationCap, Award, CheckCircle2, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        if (result.paymentUrl) {
          // Abre o link de pagamento do Asaas em uma nova aba
          window.open(result.paymentUrl, '_blank');
        }
        // Redireciona para a página de sucesso onde ele pode baixar o Ingresso
        window.location.href = `/sucesso/${result.ticketId}`;
      } else {
        alert(result.error || 'Erro ao processar pagamento');
      }
    } catch (error) {
      alert('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ paddingBottom: '5rem', overflow: 'hidden' }}>
      <header className="flex flex-col items-center justify-center text-center hero-section animate-fade-up" style={{ padding: '4rem 0 4rem' }}>
        
        {/* Logos Section */}
        <div 
          className="flex gap-6 items-center justify-center animate-fade-up delay-100 mobile-col" 
          style={{ marginBottom: '4rem', width: '100%', maxWidth: '800px' }}
        >
          {/* Card TJAEM */}
          <div className="glass-panel flex items-center justify-center" style={{ flex: 1, padding: '1.5rem', borderRadius: '24px' }}>
            <img 
              src="/logo-tjaem.png" 
              alt="Logo TJAEM Brasil" 
              style={{ height: '140px', objectFit: 'contain', borderRadius: '12px' }} 
            />
          </div>

          <div style={{ color: 'var(--primary)', opacity: 0.5 }} className="hidden-mobile">
            <span style={{ fontSize: '1.5rem' }}>&</span>
          </div>

          {/* Card CAMEB */}
          <div className="glass-panel flex items-center justify-center" style={{ flex: 1, padding: '1.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.9)' }}>
            <img 
              src="/logo-cameb.png" 
              alt="Logo CAMEB Brasil" 
              style={{ height: '100px', objectFit: 'contain', filter: 'brightness(1.1)' }} 
            />
          </div>
        </div>

        <p style={{ textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
          Convite Especial Oficial
        </p>
        <h1 className="gold-gradient-text animate-scale-in delay-100" style={{ fontSize: '5rem', marginBottom: '0.5rem', lineHeight: '1.1' }}>
          30 ANOS
        </h1>
        <h2 className="animate-fade-up delay-200" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 400 }}>
          DA LEI DE ARBITRAGEM NO BRASIL
        </h2>
        <p className="animate-fade-up delay-300" style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.8)', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.8 }}>
          Uma oportunidade majestosa para celebrar três décadas de evolução dos métodos de solução de conflitos, diálogo e segurança jurídica no país.
        </p>
        
        <div className="flex gap-4 items-center justify-center mobile-col animate-fade-up delay-400" style={{ marginBottom: '4rem', width: '100%' }}>
          <div className="glass-panel flex flex-col items-center justify-center" style={{ flex: 1, padding: '1.5rem' }}>
            <Calendar color="var(--primary)" size={32} style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)', letterSpacing: '1px' }}>DATA</p>
            <strong style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>11 de Outubro de 2026</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>Domingo • Das 9h às 17h</p>
          </div>
          <div className="glass-panel flex flex-col items-center justify-center" style={{ flex: 1, padding: '1.5rem' }}>
            <MapPin color="var(--primary)" size={32} style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)', letterSpacing: '1px' }}>LOCAL</p>
            <strong style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>Asa Sul, Brasília / DF</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>SGAS quadra 603 Sul, conjunto "c" L2 Sul</p>
          </div>
        </div>

        <div className="animate-fade-up delay-400" style={{ width: '100%', maxWidth: '400px' }}>
          <Link href="#comprar" className="btn-primary">
            Garantir Minha Vaga
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-12">
        {/* Left Column: People & Program */}
        <section className="glass-panel animate-fade-up delay-100">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '2rem', marginBottom: '2rem', display: 'inline-block', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>
              Mesa Diretora
            </h3>
            
            <div className="grid gap-6">
              <div>
                <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Anfitrião</p>
                <strong style={{ fontSize: '1.4rem' }}>Gilvan Máximo</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>Patrulha do Consumidor</p>
              </div>
              
              <div className="flex justify-between mobile-col gap-6" style={{ marginTop: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Presidente</p>
                  <strong style={{ fontSize: '1.3rem' }}>Luiz Mattoso</strong>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Juiz Arbitral</p>
                  <strong style={{ fontSize: '1.3rem' }}>Adalberto Ferreira de Paula Carvalho</strong>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <p style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Advogado Outorgado</p>
                <strong style={{ fontSize: '1.3rem' }}>Sérgio Roberto Andrade Martins</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '2rem', display: 'inline-block', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>
              Convidados de Honra
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <li><strong style={{ fontSize: '1.2rem' }}>Celina Leão</strong><br/><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Governadora do DF</span></li>
              <li><strong style={{ fontSize: '1.2rem' }}>Michelle Bolsonaro</strong></li>
              <li><strong style={{ fontSize: '1.2rem' }}>Bia Kicis</strong></li>
              <li>
                <strong style={{ fontSize: '1.2rem' }}>Gilvan Máximo</strong><br/>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)' }}>Candidato a Deputado Federal</span>
              </li>
              <li><span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)' }}>Dois representantes candidatos a Deputado Distrital</span></li>
            </ul>
          </div>
        </section>

        {/* Right Column: Checkout & Benefits */}
        <div className="flex flex-col gap-8 animate-fade-up delay-200">
          <section className="glass-panel" style={{ background: 'linear-gradient(to bottom right, rgba(223, 186, 82, 0.1), rgba(4, 8, 18, 0.8))' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.6rem' }}>Privilégios do Participante</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <li className="flex items-center gap-4">
                <div style={{ padding: '0.5rem', background: 'rgba(223, 186, 82, 0.15)', borderRadius: '50%' }}>
                  <BookOpen color="var(--primary)" size={24} />
                </div>
                <span style={{ fontSize: '1.1rem' }}>Apostila Oficial do Evento</span>
              </li>
              <li className="flex items-center gap-4">
                <div style={{ padding: '0.5rem', background: 'rgba(223, 186, 82, 0.15)', borderRadius: '50%' }}>
                  <CheckCircle2 color="var(--primary)" size={24} />
                </div>
                <span style={{ fontSize: '1.1rem' }}>Certificado de Participação</span>
              </li>
              <li className="flex items-center gap-4">
                <div style={{ padding: '0.5rem', background: 'rgba(223, 186, 82, 0.15)', borderRadius: '50%' }}>
                  <Shield color="var(--primary)" size={24} />
                </div>
                <span style={{ fontSize: '1.1rem' }}>Crachá de Acesso Exclusivo</span>
              </li>
              <li className="flex items-center gap-4">
                <div style={{ padding: '0.5rem', background: 'rgba(223, 186, 82, 0.15)', borderRadius: '50%' }}>
                  <Award color="var(--primary)" size={24} />
                </div>
                <span style={{ fontSize: '1.1rem' }}>Diploma com Carga Horária</span>
              </li>
            </ul>
          </section>

          <section id="comprar" className="glass-panel" style={{ flex: 1, border: '1px solid var(--primary)', boxShadow: '0 0 40px rgba(223, 186, 82, 0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '2rem', color: '#fff' }}>Inscreva-se</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>Reserve sua credencial e acesse a área exclusiva.</p>
            </div>
            
            <form className="flex flex-col gap-5" onSubmit={handleCheckout}>
              <input type="text" name="name" placeholder="Nome Completo" className="input-field" required />
              <input type="email" name="email" placeholder="E-mail" className="input-field" required />
              <div className="flex gap-4 mobile-col">
                <input type="text" name="cpf" placeholder="CPF" className="input-field" required />
                <input type="tel" name="phone" placeholder="WhatsApp" className="input-field" required />
              </div>
              <input type="password" name="password" placeholder="Crie uma Senha" className="input-field" required />
              
              <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--primary)' }}>Método de Pagamento</p>
                <div className="flex gap-4 mobile-col">
                  <label className="custom-radio flex-1">
                    <input type="radio" name="paymentMethod" value="PIX" defaultChecked /> 
                    <span>PIX <span style={{ fontSize: '0.8rem', color: '#4ade80', display: 'block' }}>(Imediato)</span></span>
                  </label>
                  <label className="custom-radio flex-1">
                    <input type="radio" name="paymentMethod" value="CREDIT_CARD" /> Cartão
                  </label>
                  <label className="custom-radio flex-1">
                    <input type="radio" name="paymentMethod" value="BOLETO" /> Boleto
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
                {loading ? 'Processando...' : 'Finalizar Inscrição Segura'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>
                Ambiente 100% seguro processado por Asaas.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
