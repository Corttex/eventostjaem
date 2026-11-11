'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Search, RefreshCw, Download, Printer, Shield, 
  CheckCircle2, Clock, AlertCircle, CreditCard, DollarSign, 
  Users, Ticket, Award, Plus, FileText, QrCode, ExternalLink, X, ChevronRight,
  UtensilsCrossed, Sparkles, Droplets, Coffee
} from 'lucide-react';

interface TicketItem {
  id: string;
  userId: string;
  asaasPaymentId: string | null;
  status: string; // 'PAID' | 'PENDING' | 'CANCELLED'
  paymentMethod: string | null;
  amount: number;
  ticketType: string | null;
  qrCodeToken: string;
  scanned: boolean;
  scannedAt: string | null;
  createdAt: string;
  isAssociate?: boolean;
  associateRegistration?: string | null;
  associateDocUrl?: string | null;
  associateApproved?: boolean;
  discountAmount?: number;
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
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'UNICO' | 'WITH_KIT' | 'WITH_BUFFET' | 'CORTESIA'>('ALL');
  const [associateFilter, setAssociateFilter] = useState<'ALL' | 'ASSOCIATES' | 'PENDING_APPROVAL' | 'APPROVED'>('ALL');
  const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'CREDENCIAS'>('PEDIDOS');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal Novo Ingresso Cortesia/Manual
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualHasKit, setManualHasKit] = useState(false);
  const [manualHasBuffet, setManualHasBuffet] = useState(false);
  const [manualPaymentMethod, setManualPaymentMethod] = useState('CORTESIA_MANUAL');
  const [manualBaseType, setManualBaseType] = useState('CORTESIA'); // CORTESIA ou PAGO

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

  const handleConfirmPaymentManual = async (ticketId: string, asaasPaymentId?: string | null) => {
    if (!confirm('Deseja confirmar manualmente o pagamento deste ingresso? O participante terá seu ingresso liberado imediatamente.')) {
      return;
    }
    setActionLoadingId(ticketId);
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, paymentId: asaasPaymentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Pagamento confirmado com sucesso! Ingresso liberado.');
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, status: 'PAID' } : null);
        }
      } else {
        alert(data.error || 'Erro ao confirmar pagamento.');
      }
    } catch (e) {
      alert('Erro de conexão ao confirmar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveAssociate = async (ticketId: string, approved: boolean) => {
    setActionLoadingId(ticketId);
    try {
      const res = await fetch('/api/admin/approve-associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, approved })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(approved ? 'Carteirinha APROVADA com sucesso! QR Code e PDF liberados para o participante.' : 'Aprovação da carteirinha revogada/rejeitada.');
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, associateApproved: approved } : null);
        }
      } else {
        alert(data.error || 'Erro ao processar aprovação.');
      }
    } catch (e) {
      alert('Erro de conexão ao atualizar status de aprovação.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const calculateManualAmount = () => {
    if (manualBaseType === 'CORTESIA') return 0.00;
    let total = 490.00;
    if (manualHasKit) total += 109.90;
    if (manualHasBuffet) total += 139.90;
    return total;
  };

  const handleManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const formProps = Object.fromEntries(formData.entries());

    const amount = calculateManualAmount();
    const payload = {
      name: formProps.name,
      email: formProps.email,
      cpf: formProps.cpf,
      phone: formProps.phone,
      ticketType: manualBaseType === 'CORTESIA' ? 'CORTESIA_CONVIDADO' : 'INGRESSO_UNICO',
      hasKit: manualHasKit,
      hasBuffet: manualHasBuffet,
      amount: amount,
      paymentMethod: manualPaymentMethod
    };

    try {
      const res = await fetch('/api/admin/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Credencial emitida com sucesso no sistema!');
        (e.target as HTMLFormElement).reset();
        setManualHasKit(false);
        setManualHasBuffet(false);
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
      t.ticketType || 'INGRESSO_UNICO',
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

    const tType = (t.ticketType || '').toUpperCase();
    if (typeFilter === 'WITH_KIT' && !tType.includes('KIT')) return false;
    if (typeFilter === 'WITH_BUFFET' && !tType.includes('BUFFET')) return false;
    if (typeFilter === 'CORTESIA' && !tType.includes('CORTESIA') && (t.paymentMethod || '') !== 'CORTESIA_MANUAL') return false;
    if (typeFilter === 'UNICO' && (tType.includes('CORTESIA') || (t.paymentMethod || '') === 'CORTESIA_MANUAL')) return false;

    if (associateFilter === 'ASSOCIATES' && !t.isAssociate) return false;
    if (associateFilter === 'PENDING_APPROVAL' && (!t.isAssociate || t.associateApproved)) return false;
    if (associateFilter === 'APPROVED' && (!t.isAssociate || !t.associateApproved)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.user.name.toLowerCase().includes(q);
      const matchCpf = t.user.cpf.includes(q);
      const matchEmail = t.user.email.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchPaymentId = (t.asaasPaymentId || '').toLowerCase().includes(q);
      const matchMatricula = (t.associateRegistration || '').toLowerCase().includes(q);
      return matchName || matchCpf || matchEmail || matchId || matchPaymentId || matchMatricula;
    }

    return true;
  });

  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center" style={{ minHeight: '80vh', padding: '2rem 1rem' }}>
        <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--primary)' }}>
          <div className="icon-badge" style={{ width: '54px', height: '54px', margin: '0 auto 1.2rem' }}>
            <Shield color="var(--primary)" size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '0.4rem' }}>Acesso Restrito</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.8rem' }}>
            Painel Administrativo Oficial TJAEM & CAMEB Brasil
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              placeholder="Digite o PIN de Segurança" 
              className="input-field" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.3rem', fontWeight: 700 }}
              required 
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.9rem' }}>
              Autenticar e Entrar
            </button>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem', textDecoration: 'none' }}>
              ← Voltar ao site do evento
            </Link>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1240px' }}>
      
      {/* Topo do Painel */}
      <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              <ArrowLeft size={18} /> Ver Página do Evento
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              Sair da Conta
            </button>
          </div>

          <h1 className="gold-gradient-text" style={{ fontSize: '2.2rem', margin: '0.5rem 0 0.2rem' }}>
            Painel Executivo • 30 Anos Arbitragem
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: 0 }}>
            01.12.2026 • Versá Restaurante & Eventos (Núcleo Bandeirante, DF). Cobranças via PIX e Cartão até 10x sem juros.
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
            <Plus size={18} /> Emitir Manual / Cortesia
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

      {/* Cards de Métricas */}
      <div className="grid grid-cols-4 gap-4 mobile-col" style={{ marginBottom: '2rem' }}>
        
        {/* Receita Confirmada */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #4ade80' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            RECEITA CONFIRMADA
          </span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4ade80', marginTop: '0.3rem', lineHeight: 1.1 }}>
            R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', display: 'block' }}>
            Via Asaas ({summary.paidCount} pagas) • PIX / Cartão até 10x
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
            Validados no Versá com QR Code
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
              placeholder="Buscar por participante, CPF, código ou e-mail..."
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

            {/* Filtro Opcionais e Categorias */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="input-field"
              style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', background: '#0a0f1e', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <option value="ALL">Todas as Configurações</option>
              <option value="UNICO">Ingresso Único Geral</option>
              <option value="WITH_KIT">Com Kit Oficial (+ R$ 109,90)</option>
              <option value="WITH_BUFFET">Com Almoço Buffet (+ R$ 139,90)</option>
              <option value="CORTESIA">Cortesias / Manuais</option>
            </select>

            {/* Filtro Associados TJAEM */}
            <select
              value={associateFilter}
              onChange={(e) => setAssociateFilter(e.target.value as any)}
              className="input-field"
              style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', background: '#0a0f1e', cursor: 'pointer', border: associateFilter !== 'ALL' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.15)', color: associateFilter !== 'ALL' ? '#ffeca8' : '#fff' }}
            >
              <option value="ALL">Todos os Inscritos</option>
              <option value="ASSOCIATES">★ Apenas Associados TJAEM</option>
              <option value="PENDING_APPROVAL">⚠️ Carteirinha Pendente de Aprovação</option>
              <option value="APPROVED">✓ Carteirinha Aprovada</option>
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
        
        <div className="desktop-only" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem 1.2rem' }}>CREDENCIAL / DATA</th>
                <th style={{ padding: '1rem 1.2rem' }}>PARTICIPANTE</th>
                <th style={{ padding: '1rem 1.2rem' }}>OPCIONAIS (KIT / ALMOÇO)</th>
                <th style={{ padding: '1rem 1.2rem' }}>VALOR & MÉTODO</th>
                <th style={{ padding: '1rem 1.2rem' }}>PAGAMENTO</th>
                <th style={{ padding: '1rem 1.2rem' }}>ASSOCIADO TJAEM</th>
                <th style={{ padding: '1rem 1.2rem' }}>PORTARIA (VERSÁ)</th>
                <th style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'rgba(255,255,255,0.5)' }}>
                    Nenhuma inscrição encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const typeStr = (ticket.ticketType || '').toUpperCase();
                  const hasKit = typeStr.includes('KIT');
                  const hasBuffet = typeStr.includes('BUFFET');

                  return (
                    <tr 
                      key={ticket.id}
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: ticket.scanned ? 'rgba(74, 222, 128, 0.03)' : (ticket.isAssociate && !ticket.associateApproved ? 'rgba(250, 204, 21, 0.04)' : 'transparent'),
                        transition: 'background 0.2s'
                      }}
                    >
                      {/* Código da Credencial */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block', fontFamily: 'monospace' }}>
                          #{ticket.id.substring(0, 8).toUpperCase()}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                          {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} • {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Participante */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                          {ticket.user.name}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          CPF: {ticket.user.cpf} • {ticket.user.phone || ticket.user.email}
                        </span>
                      </td>

                      {/* Opcionais (Kit e Buffet) */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <div className="flex flex-col gap-1">
                          <span style={{ 
                            background: 'rgba(223, 186, 82, 0.15)', 
                            border: '1px solid var(--primary)', 
                            color: '#ffeca8', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            display: 'inline-block',
                            width: 'fit-content'
                          }}>
                            ✓ Ingresso Único R$ 490
                          </span>

                          <div className="flex gap-1 flex-wrap">
                            {hasKit ? (
                              <span style={{ background: '#3b82f6', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                + Kit 30 Anos
                              </span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Sem Kit</span>
                            )}

                            {hasBuffet ? (
                              <span style={{ background: '#10b981', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                + Almoço Buffet
                              </span>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>Sem Almoço</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Valor & Método */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#fff', display: 'block' }}>
                          R$ {(ticket.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {ticket.paymentMethod?.replace('CREDIT_CARD_', 'CARTÃO ') || 'PIX'}
                          {ticket.isAssociate && (
                            <span style={{ color: '#4ade80', marginLeft: '0.4rem', fontWeight: 700 }}>(Associado)</span>
                          )}
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
                            gap: '0.3rem'
                          }}>
                            ✓ PAGO / APROVADO
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span style={{ 
                              background: 'rgba(250, 204, 21, 0.15)', 
                              color: '#facc15', 
                              padding: '0.3rem 0.75rem', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              width: 'fit-content'
                            }}>
                              <Clock size={12} /> AGUARDANDO
                            </span>
                            
                            {/* Se tiver comprovante anexado ou for PIX */}
                            <div className="flex gap-1 items-center flex-wrap" style={{ marginTop: '0.2rem' }}>
                              {ticket.associateDocUrl && (
                                <a
                                  href={ticket.associateDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: 'rgba(223, 186, 82, 0.2)',
                                    border: '1px solid var(--primary)',
                                    color: '#ffeca8',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                  }}
                                >
                                  Ver Comprovante
                                </a>
                              )}
                              <button
                                onClick={() => handleConfirmPaymentManual(ticket.id, ticket.asaasPaymentId)}
                                disabled={actionLoadingId === ticket.id}
                                style={{
                                  background: '#4ade80',
                                  color: '#000',
                                  border: 'none',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                                title="Confirmar pagamento manualmente"
                              >
                                {actionLoadingId === ticket.id ? 'Aprovando...' : 'Aprovar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Associado TJAEM */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        {ticket.isAssociate ? (
                          ticket.associateApproved ? (
                            <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} /> Aprovado ({ticket.associateRegistration || 'Matrícula'})
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span style={{ color: '#facc15', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                <AlertCircle size={13} /> Pendente Aprovação
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveAssociate(ticket.id, true)}
                                  disabled={actionLoadingId === ticket.id}
                                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Aprovar
                                </button>
                                {ticket.associateDocUrl && (
                                  <a
                                    href={ticket.associateDocUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', fontSize: '0.72rem', textDecoration: 'underline' }}
                                  >
                                    Ver Doc
                                  </a>
                                )}
                              </div>
                            </div>
                          )
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Geral (Não)</span>
                        )}
                      </td>

                      {/* Portaria */}
                      <td style={{ padding: '1rem 1.2rem' }}>
                        {ticket.scanned ? (
                          <span style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 700 }}>
                            ✓ Entrada Realizada
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                            Aguardando Check-in
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '1rem 1.2rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHES DO INGRESSO */}
      {selectedTicket && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '580px', position: 'relative', padding: '2rem' }}>
            <button 
              onClick={() => setSelectedTicket(null)}
              style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>

            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket color="var(--primary)" size={24} /> Credencial #{selectedTicket.id.substring(0, 8).toUpperCase()}
            </h3>

            <div className="flex flex-col gap-3" style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.85)' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Participante:</span> <strong>{selectedTicket.user.name}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>CPF:</span> <strong>{selectedTicket.user.cpf}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>E-mail:</span> <strong>{selectedTicket.user.email}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>WhatsApp:</span> <strong>{selectedTicket.user.phone || 'Não informado'}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Configuração:</span> <strong style={{ color: 'var(--primary)' }}>{selectedTicket.ticketType || 'INGRESSO_UNICO'}</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Valor Total:</span> <strong>R$ {(selectedTicket.amount || 0).toFixed(2)} ({selectedTicket.paymentMethod || 'PIX'})</strong></div>
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Status do Pagamento:</span> <strong style={{ color: selectedTicket.status === 'PAID' ? '#4ade80' : '#facc15' }}>{selectedTicket.status}</strong></div>
              {selectedTicket.associateDocUrl && (
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Comprovante / Anexo:</span>{' '}
                  <a href={selectedTicket.associateDocUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#ffeca8', textDecoration: 'underline', fontWeight: 700 }}>
                    Visualizar Arquivo Anexado
                  </a>
                </div>
              )}
              <div><span style={{ color: 'rgba(255,255,255,0.6)' }}>Portaria Versá:</span> <strong>{selectedTicket.scanned ? '✓ Entrada Realizada' : 'Pendente de Check-in'}</strong></div>
            </div>

            <div className="flex gap-3" style={{ marginTop: '1.8rem', flexWrap: 'wrap' }}>
              {selectedTicket.status !== 'PAID' && (
                <button
                  onClick={() => handleConfirmPaymentManual(selectedTicket.id, selectedTicket.asaasPaymentId)}
                  disabled={actionLoadingId === selectedTicket.id}
                  style={{
                    background: '#4ade80',
                    color: '#000',
                    border: 'none',
                    padding: '0.8rem 1.4rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {actionLoadingId === selectedTicket.id ? 'Aprovando...' : '✓ Aprovar Pagamento Manualmente'}
                </button>
              )}
              <Link
                href={`/api/ticket/${selectedTicket.id}`}
                target="_blank"
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
              >
                Visualizar Credencial PDF
              </Link>
              <button
                onClick={() => setSelectedTicket(null)}
                className="btn-secondary"
                style={{ padding: '0.8rem 1.4rem' }}
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
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '540px', position: 'relative', padding: '2rem' }}>
            <button 
              onClick={() => setManualModalOpen(false)}
              style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>

            <h3 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus color="var(--primary)" size={22} /> Emitir Credencial no Versá
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.4rem' }}>
              Emita ingressos para convidados de honra, palestrantes, imprensa ou acertos diretos (PIX / Cartão).
            </p>

            <form onSubmit={handleManualTicket} className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Nome Completo *</label>
                <input type="text" name="name" placeholder="Nome do participante" className="input-field" required />
              </div>

              <div className="grid grid-cols-2 gap-3 mobile-col">
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>E-mail *</label>
                  <input type="email" name="email" placeholder="email@participante.com" className="input-field" required />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>CPF *</label>
                  <input type="text" name="cpf" placeholder="000.000.000-00" className="input-field" required />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>WhatsApp / Telefone</label>
                <input type="tel" name="phone" placeholder="(61) 99999-9999" className="input-field" />
              </div>

              {/* Tipo de Emissão */}
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Modalidade</label>
                <select 
                  value={manualBaseType} 
                  onChange={e => setManualBaseType(e.target.value)} 
                  className="input-field" 
                  style={{ background: '#0a0f1e' }}
                >
                  <option value="CORTESIA">★ Cortesia de Honra / Palestrante (R$ 0,00)</option>
                  <option value="PAGO">Ingresso Único Oficial (R$ 490,00)</option>
                </select>
              </div>

              {/* Opcionais */}
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.9rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>Opcionais Inclusos:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#fff' }}>
                  <input 
                    type="checkbox" 
                    checked={manualHasKit} 
                    onChange={e => setManualHasKit(e.target.checked)} 
                    style={{ width: '16px', height: '16px', accentColor: '#dfba52' }}
                  />
                  Incluir Kit Oficial 30 Anos (+ R$ 109,90)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', color: '#fff' }}>
                  <input 
                    type="checkbox" 
                    checked={manualHasBuffet} 
                    onChange={e => setManualHasBuffet(e.target.checked)} 
                    style={{ width: '16px', height: '16px', accentColor: '#dfba52' }}
                  />
                  Incluir Almoço Buffet Completo (+ R$ 139,90)
                </label>
              </div>

              {/* Método de Pagamento */}
              <div>
                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Método Registrado</label>
                <select 
                  value={manualPaymentMethod} 
                  onChange={e => setManualPaymentMethod(e.target.value)} 
                  className="input-field" 
                  style={{ background: '#0a0f1e' }}
                >
                  <option value="CORTESIA_MANUAL">Cortesia Institucional TJAEM / CAMEB</option>
                  <option value="PIX">PIX Direto</option>
                  <option value="CREDIT_CARD_10X">Cartão de Crédito 10x sem Juros</option>
                  <option value="CREDIT_CARD_1X">Cartão de Crédito à Vista</option>
                  <option value="FATURAMENTO_DIRETO">Faturamento Direto</option>
                </select>
              </div>

              <div style={{ textAlign: 'right', fontSize: '1rem', color: '#ffeca8', fontWeight: 700 }}>
                Valor Total: R$ {calculateManualAmount().toFixed(2).replace('.', ',')}
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={manualLoading}
                style={{ marginTop: '0.3rem', padding: '0.9rem' }}
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