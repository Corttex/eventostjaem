'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, RefreshCw, Download, Printer, Shield, 
  CheckCircle2, Clock, AlertCircle, CreditCard, DollarSign, 
  Users, Ticket, Award, Plus, FileText, QrCode, ExternalLink, X, ChevronRight
} from 'lucide-react';

interface TicketItem {
  id: string;
  userId: string;
  asaasPaymentId: string | null;
  status: string; // 'PAID' | 'PENDING' | 'CANCELLED'
  paymentMethod: string | null;
  amount: number;
  ticketType: string | null; // 'VIP' | 'PADRAO'
  qrCodeToken: string;
  scanned: boolean;
  scannedAt: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
}

interface SummaryData {
  totalTickets: number;
  paidCount: number;
  pendingCount: number;
  checkedInCount: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export default function AdminPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalTickets: 0,
    paidCount: 0,
    pendingCount: 0,
    checkedInCount: 0,
    totalRevenue: 0,
    pendingRevenue: 0
  });

  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Filtros & Busca
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VIP' | 'PADRAO'>('ALL');
  const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'CREDENCIAS'>('PEDIDOS');

  // Modal Novo Ingresso Cortesia/Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  // Modal Detalhes do Ingresso
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tickets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tickets) setTickets(data.tickets);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Erro ao buscar tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_auth');
    if (isAuth === 'true') {
      setIsAuthenticated(true);
      fetchTickets();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === '807522') {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      fetchTickets();
    } else {
      alert('PIN Incorreto. Utilize o PIN de administrador.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  const handleManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/admin/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Credencial gerada com sucesso!');
        (e.target as HTMLFormElement).reset();
        setManualModalOpen(false);
        fetchTickets();
      } else {
        alert('Erro ao emitir credencial.');
      }
    } catch (e) {
      alert('Erro de conexão ao emitir credencial.');
    } finally {
      setManualLoading(false);
    }
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert('Nenhum dado para exportar.');
      return;
    }

    const headers = ['ID', 'Participante', 'CPF', 'Email', 'Telefone', 'Tipo', 'Valor', 'Metodo', 'Status', 'CheckIn', 'Data'];
    const rows = filteredTickets.map(t => [
      t.id,
      `"${t.user.name.replace(/"/g, '""')}"`,
      `"${t.user.cpf}"`,
      `"${t.user.email}"`,
      `"${t.user.phone || ''}"`,
      t.ticketType || 'VIP',
      (t.amount || 0).toFixed(2),
      t.paymentMethod || 'PIX',
      t.status,
      t.scanned ? 'SIM' : 'NAO',
      new Date(t.createdAt).toLocaleDateString('pt-BR')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inscritos_tjaem_30anos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem da Lista
  const filteredTickets = tickets.filter(t => {
    if (paymentFilter === 'PAID' && t.status !== 'PAID') return false;
    if (paymentFilter === 'PENDING' && t.status !== 'PENDING') return false;
    if (typeFilter !== 'ALL' && (t.ticketType || 'VIP') !== typeFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.user.name.toLowerCase().includes(q);
      const matchCpf = t.user.cpf.includes(q);
      const matchEmail = t.user.email.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchPaymentId = (t.asaasPaymentId || '').toLowerCase().includes(q);
      return matchName || matchCpf || matchEmail || matchId || matchPaymentId;
    }

    return true;
  });

  // TELA DE LOGIN RESTITO
  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center animate-fade-in" style={{ minHeight: '85vh', padding: '2rem' }}>
        <form onSubmit={handleLogin} className="glass-panel text-center flex flex-col gap-5" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
          <div style={{ margin: '0 auto', background: 'rgba(223, 186, 82, 0.12)', padding: '1.2rem', borderRadius: '50%', width: '75px', height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={38} color="var(--primary)" />
          </div>

          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#fff', margin: '0 0 0.5rem' }}>Painel Central de Vendas & ADM</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
              Gestão financeira, controle de inscrições e integração com Asaas
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', display: 'block' }}>PIN de Segurança</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••" 
              className="input-field text-center" 
              style={{ fontSize: '1.8rem', letterSpacing: '6px', fontWeight: 700 }}
              maxLength={6}
              required 
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1.05rem' }}>
            Acessar Central Administrativa
          </button>

          <Link href="/" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            ← Voltar para o portal do evento
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="animate-fade-in" style={{ padding: '2rem 2.5rem 6rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Voltar ao Início
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/validador" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <QrCode size={16} /> Abrir Portaria & Validador →
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <button 
            onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Topo com Título, Status Webhook e Ações Rápidas */}
      <div className="flex items-center justify-between tablet-col gap-4" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              OPERAÇÃO 30 ANOS DA LEI DE ARBITRAGEM • ASaaS ONLINE
            </span>
          </div>
          <h1 className="gold-gradient-text" style={{ fontSize: '2.4rem', margin: '0.2rem 0 0.4rem', lineHeight: 1.15 }}>
            Central de Ingressos & Dashboard de Vendas
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: 0 }}>
            Acompanhamento em tempo real de liquidações Asaas (PIX, Cartão e Boleto) e credenciamento oficial.
          </p>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex gap-2 items-center mobile-col">
          <button 
            onClick={() => setActiveTab('PEDIDOS')}
            style={{ 
              background: activeTab === 'PEDIDOS' ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
              color: activeTab === 'PEDIDOS' ? '#000' : '#fff',
              border: 'none',
              padding: '0.75rem 1.2rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <DollarSign size={18} /> Ingressos ({summary.totalTickets})
          </button>

          <button 
            onClick={() => setManualModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '0.75rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={18} /> Emitir Manual
          </button>

          <button 
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Exportar para Excel / CSV"
          >
            <Download size={18} /> CSV
          </button>

          <button 
            onClick={() => window.print()}
            className="btn-secondary"
            style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Imprimir Relatório"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Cards de Métricas Estilo Esplendor */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: '2rem' }}>
        
        {/* Receita Confirmada */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #4ade80' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            RECEITA CONFIRMADA
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4ade80', marginTop: '0.3rem', lineHeight: 1.1 }}>
            R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', display: 'block' }}>
            Via Asaas Cobranças ({summary.paidCount} pagos)
          </span>
        </div>

        {/* Ingressos Emitidos / Pagos */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            INGRESSOS CONFIRMADOS
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', marginTop: '0.3rem', lineHeight: 1.1 }}>
            {summary.paidCount} <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>/ {summary.totalTickets}</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.4rem', display: 'block' }}>
            Taxa de conversão: {summary.totalTickets > 0 ? Math.round((summary.paidCount / summary.totalTickets) * 100) : 0}%
          </span>
        </div>

        {/* Aguardando Pagamento */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #facc15' }}>
          <span style={{ fontSize: '0.75rem', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            AGUARDANDO PAGAMENTO
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#facc15', marginTop: '0.3rem', lineHeight: 1.1 }}>
            {summary.pendingCount}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', display: 'block' }}>
            R$ {summary.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em aberto
          </span>
        </div>

        {/* Check-ins na Portaria */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #60a5fa' }}>
          <span style={{ fontSize: '0.75rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            PRESENTES NA PORTARIA
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.3rem', lineHeight: 1.1 }}>
            {summary.checkedInCount} <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>/ {summary.paidCount}</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', display: 'block' }}>
            Validados com QR Code
          </span>
        </div>

      </div>

      {/* Barra de Filtros, Status e Busca */}
      <div className="glass-panel" style={{ padding: '1rem 1.4rem', marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between tablet-col gap-3">
          
          {/* Busca por Comprador, Código ou E-mail */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px', width: '100%' }}>
            <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por comprador, CPF, código ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.4rem', fontSize: '0.9rem', padding: '0.65rem 0.8rem 0.65rem 2.4rem', width: '100%' }}
            />
          </div>

          {/* Filtros em Dropdown */}
          <div className="flex gap-2 items-center mobile-col" style={{ width: 'auto' }}>
            
            {/* Filtro Status Pagamento */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="input-field"
              style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', background: '#0a0f1e', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <option value="ALL">Todos os Pagamentos</option>
              <option value="PAID">Apenas Aprovados / Pagos</option>
              <option value="PENDING">Apenas Aguardando</option>
            </select>

            {/* Filtro Categoria */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="input-field"
              style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', background: '#0a0f1e', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="VIP">Ingresso VIP + Kit</option>
              <option value="PADRAO">Ingresso Padrão</option>
            </select>

            {/* Atualizar */}
            <button
              onClick={fetchTickets}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.65rem 0.9rem', minWidth: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Recarregar dados"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* Tabela de Inscrições / Pedidos */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Versão Desktop */}
        <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem 1.2rem' }}>PEDIDO / CÓDIGO</th>
                <th style={{ padding: '1rem 1.2rem' }}>CATEGORIA</th>
                <th style={{ padding: '1rem 1.2rem' }}>COMPRADOR / PARTICIPANTE</th>
                <th style={{ padding: '1rem 1.2rem' }}>VALOR & MÉTODO</th>
                <th style={{ padding: '1rem 1.2rem' }}>PAGAMENTO</th>
                <th style={{ padding: '1rem 1.2rem' }}>CREDENCIAL & PORTARIA</th>
                <th style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'rgba(255,255,255,0.5)' }}>
                    Nenhuma inscrição encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: ticket.scanned ? 'rgba(74, 222, 128, 0.03)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    {/* Código do Pedido */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block', fontFamily: 'monospace' }}>
                        TJAEM-2026-{ticket.id.substring(0, 6).toUpperCase()}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} • {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Categoria do Ingresso */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      {(ticket.ticketType || 'VIP') === 'VIP' ? (
                        <span style={{ 
                          background: 'linear-gradient(135deg, rgba(223, 186, 82, 0.2), rgba(223, 186, 82, 0.08))', 
                          border: '1px solid var(--primary)', 
                          color: '#ffeca8', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '8px', 
                          fontSize: '0.8rem', 
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          ★ VIP + KIT
                        </span>
                      ) : (
                        <span style={{ 
                          background: 'rgba(255,255,255,0.08)', 
                          color: '#fff', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '8px', 
                          fontSize: '0.8rem', 
                          fontWeight: 600 
                        }}>
                          PADRÃO
                        </span>
                      )}
                    </td>

                    {/* Comprador / Participante */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                        {ticket.user.name}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                        {ticket.user.email} • {ticket.user.phone || ticket.user.cpf}
                      </span>
                    </td>

                    {/* Valor & Método */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                        R$ {(ticket.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {ticket.paymentMethod || 'PIX'}
                      </span>
                    </td>

                    {/* Status Pagamento */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      {ticket.status === 'PAID' ? (
                        <span style={{ 
                          background: 'rgba(74, 222, 128, 0.15)', 
                          color: '#4ade80', 
                          padding: '0.3rem 0.75rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <CheckCircle2 size={13} /> APROVADO
                        </span>
                      ) : (
                        <span style={{ 
                          background: 'rgba(250, 204, 21, 0.15)', 
                          color: '#facc15', 
                          padding: '0.3rem 0.75rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <Clock size={13} /> AGUARDANDO
                        </span>
                      )}
                    </td>

                    {/* Credencial & Portaria */}
                    <td style={{ padding: '1rem 1.2rem' }}>
                      {ticket.scanned ? (
                        <div style={{ color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={16} />
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.85rem' }}>Presente no Evento</strong>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                              {ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'OK'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={16} />
                          <span>Não compareceu</span>
                        </div>
                      )}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>
                      <div className="flex gap-2 justify-center">
                        <Link
                          href={`/api/ticket/${ticket.id}`}
                          target="_blank"
                          className="btn-secondary"
                          style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
                          title="Baixar Credencial PDF"
                        >
                          <FileText size={14} /> PDF
                        </Link>

                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="btn-secondary"
                          style={{ padding: '0.45rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
                        >
                          Gerenciar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile / Cards */}
        <div className="mobile-cards-only" style={{ display: 'none', padding: '1rem' }}>
          {filteredTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
              Nenhum pedido encontrado.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTickets.map(ticket => (
                <div 
                  key={ticket.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.7rem'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                        TJAEM-2026-{ticket.id.substring(0, 6).toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#fff', display: 'block', marginTop: '0.1rem' }}>
                        {ticket.user.name}
                      </strong>
                    </div>

                    {ticket.status === 'PAID' ? (
                      <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                        APROVADO
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                        PENDENTE
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                    <span>Tipo: <strong style={{ color: (ticket.ticketType || 'VIP') === 'VIP' ? '#ffeca8' : '#fff' }}>{ticket.ticketType || 'VIP'}</strong></span>
                    <span>Valor: <strong style={{ color: '#fff' }}>R$ {(ticket.amount || 0).toFixed(2)}</strong></span>
                  </div>

                  <div className="flex gap-2" style={{ marginTop: '0.3rem' }}>
                    <Link
                      href={`/api/ticket/${ticket.id}`}
                      target="_blank"
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      <FileText size={15} /> Credencial PDF
                    </Link>
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="btn-primary"
                      style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DETALHES / GERENCIAR INGRESSO */}
      {selectedTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '540px', position: 'relative', padding: '2rem' }}>
            <button 
              onClick={() => setSelectedTicket(null)}
              style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>

            <h3 style={{ fontSize: '1.4rem', color: '#fff', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket color="var(--primary)" size={22} /> Detalhes da Inscrição
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              ID: {selectedTicket.id}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Participante:</span> <strong>{selectedTicket.user.name}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>CPF:</span> <strong>{selectedTicket.user.cpf}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>E-mail:</span> <strong>{selectedTicket.user.email}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>WhatsApp:</span> <strong>{selectedTicket.user.phone || 'Não informado'}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Categoria:</span> <strong style={{ color: 'var(--primary)' }}>{selectedTicket.ticketType || 'VIP'}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Valor:</span> <strong>R$ {(selectedTicket.amount || 0).toFixed(2)} ({selectedTicket.paymentMethod || 'PIX'})</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>ID Asaas:</span> <code>{selectedTicket.asaasPaymentId || 'Cortesia / Manual'}</code></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Check-in:</span> {selectedTicket.scanned ? <span style={{ color: '#4ade80', fontWeight: 700 }}>Presente</span> : <span style={{ color: '#f87171' }}>Não entrou</span>}</div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/api/ticket/${selectedTicket.id}`}
                target="_blank"
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
              >
                Abrir PDF Oficial
              </Link>
              <button
                onClick={() => setSelectedTicket(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMITIR INGRESSO MANUAL / CORTESIA */}
      {manualModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '520px', position: 'relative', padding: '2rem' }}>
            <button 
              onClick={() => setManualModalOpen(false)}
              style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>

            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus color="var(--primary)" size={22} /> Emitir Credencial Manual
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Utilize para cortesias, palestrantes, imprensa ou acertos diretos.
            </p>

            <form onSubmit={handleManualTicket} className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Nome Completo *</label>
                <input type="text" name="name" placeholder="Nome do participante" className="input-field" required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>E-mail Oficial *</label>
                <input type="email" name="email" placeholder="email@participante.com" className="input-field" required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>CPF *</label>
                <input type="text" name="cpf" placeholder="000.000.000-00" className="input-field" required />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Categoria do Ingresso</label>
                <select name="ticketType" className="input-field" style={{ background: '#0a0f1e' }}>
                  <option value="VIP">★ Ingresso VIP + Kit Exclusivo</option>
                  <option value="PADRAO">Ingresso Padrão</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={manualLoading}
                style={{ marginTop: '0.5rem', padding: '0.9rem' }}
              >
                {manualLoading ? 'Gerando Credencial...' : 'Emitir e Liberar Ingresso'}
              </button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
