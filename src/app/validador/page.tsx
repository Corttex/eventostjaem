'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  QrCode, CheckCircle2, XCircle, AlertTriangle, Users, Ticket, 
  Search, RefreshCw, LogOut, Camera, Calendar, MapPin, Check, 
  ArrowLeft, Shield, Clock, Volume2, X
} from 'lucide-react';

interface TicketItem {
  id: string;
  qrCodeToken: string;
  status: string; // 'PAID' | 'PENDING'
  paymentMethod: string;
  amount: number;
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

interface Stats {
  total: number;
  paid: number;
  pending: number;
  scanned: number;
}

export default function ValidadorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dados da Lista
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, pending: 0, scanned: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'SCANNED'>('ALL');

  // Scanner Modal
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Som de Bip usando AudioContext nativo
  const playBeep = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem('validador_auth');
    if (isAuth === 'master') {
      setIsAuthenticated(true);
      fetchTickets();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'master' && password.trim() === '807522') {
      sessionStorage.setItem('validador_auth', 'master');
      setIsAuthenticated(true);
      setAuthError('');
      fetchTickets();
    } else {
      setAuthError('Usuário ou senha inválidos. Utilize o acesso master.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('validador_auth');
    setIsAuthenticated(false);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/validador/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Erro ao buscar ingressos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para processar leitura de QR Code
  const processScan = async (token: string, force = false) => {
    if (!token?.trim()) return;
    setScanLoading(true);

    try {
      const res = await fetch('/api/validador/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), forceConfirm: force })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playBeep('success');
        setScanResult({
          type: 'success',
          title: 'Entrada Autorizada!',
          message: data.message,
          ticket: data.ticket
        });
        // Atualiza a lista na hora
        fetchTickets();
      } else if (res.status === 402) {
        // Pendente de pagamento
        playBeep('warning');
        setScanResult({
          type: 'warning',
          title: 'Pagamento Pendente!',
          message: data.error,
          ticket: data.ticket,
          canForce: true
        });
      } else if (res.status === 409) {
        // Já utilizado
        playBeep('error');
        setScanResult({
          type: 'error',
          title: 'Ingresso Já Utilizado!',
          message: data.error,
          ticket: data.ticket
        });
      } else {
        // Não encontrado
        playBeep('error');
        setScanResult({
          type: 'error',
          title: 'Código Inválido',
          message: data.error || 'Ingresso não encontrado no sistema.'
        });
      }
    } catch (err) {
      playBeep('error');
      setScanResult({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Falha ao comunicar com o servidor.'
      });
    } finally {
      setScanLoading(false);
      setScanInput('');
      if (scanInputRef.current) scanInputRef.current.focus();
    }
  };

  // Check-in manual direto na lista
  const handleManualCheckin = async (ticketId: string, currentScanned: boolean) => {
    try {
      const res = await fetch('/api/validador/manual-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, toggle: true })
      });
      if (res.ok) {
        playBeep('success');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Inicializar câmera com html5-qrcode
  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          processScan(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('Erro ao inicializar câmera:', err);
      alert('Não foi possível acessar a câmera. Você pode usar a entrada por digitação ou bipador USB.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const openScannerModal = () => {
    setScannerOpen(true);
    setScanResult(null);
    setTimeout(() => {
      if (scanInputRef.current) scanInputRef.current.focus();
    }, 100);
  };

  const closeScannerModal = () => {
    stopCamera();
    setScannerOpen(false);
  };

  // Filtro de Ingressos
  const filteredTickets = tickets.filter(t => {
    // Filtro por status
    if (filter === 'PAID' && t.status !== 'PAID') return false;
    if (filter === 'PENDING' && t.status !== 'PENDING') return false;
    if (filter === 'SCANNED' && !t.scanned) return false;

    // Filtro por busca
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.user.name.toLowerCase().includes(q);
      const matchCpf = t.user.cpf.includes(q);
      const matchEmail = t.user.email.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      return matchName || matchCpf || matchEmail || matchId;
    }

    return true;
  });

  // TELA DE LOGIN DO VALIDADOR
  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center animate-fade-in" style={{ minHeight: '85vh', padding: '2rem' }}>
        <form onSubmit={handleLogin} className="glass-panel text-center flex flex-col gap-5" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
          <div style={{ margin: '0 auto', background: 'rgba(223, 186, 82, 0.1)', padding: '1rem', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={36} color="var(--primary)" />
          </div>

          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#fff', margin: '0 0 0.5rem' }}>Portaria & Validador</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
              Acesso exclusivo para conferência e check-in de credenciais
            </p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              {authError}
            </div>
          )}

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: master" 
              className="input-field" 
              required 
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem', display: 'block' }}>Senha / PIN</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite o PIN de acesso" 
              className="input-field" 
              required 
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem' }}>
            Entrar no Painel do Validador
          </button>

          <Link href="/" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            ← Voltar para o site do evento
          </Link>
        </form>
      </main>
    );
  }

  // PAINEL COMPLETO DO VALIDADOR
  return (
    <main className="container animate-fade-in" style={{ padding: '2.5rem 1rem 6rem', maxWidth: '1100px' }}>
      
      {/* Topo com Identificação do Evento e Ações */}
      <div className="flex items-center justify-between mobile-col gap-4" style={{ marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
            Painel Oficial do Validador
          </span>
          <h1 className="gold-gradient-text" style={{ fontSize: '2.2rem', margin: '0.3rem 0 0.5rem' }}>
            30 Anos da Lei de Arbitragem no Brasil
          </h1>
          <div className="flex gap-4 mobile-col" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
            <span className="flex items-center gap-2">
              <Calendar size={16} color="var(--primary)" /> 20 de Outubro de 2026 • Das 09h às 17h
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={16} color="var(--primary)" /> SGAS quadra 603 Sul, Asa Sul, Brasília / DF
            </span>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button 
            onClick={openScannerModal}
            className="btn-primary"
            style={{ 
              padding: '0.9rem 1.8rem', 
              fontSize: '1.05rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem',
              boxShadow: '0 0 25px rgba(223, 186, 82, 0.3)'
            }}
          >
            <QrCode size={22} />
            Validador QR Code
          </button>

          <button 
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.7)' }}
            title="Sair do Validador"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-4 gap-4 mobile-col" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Total Inscrições</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>
            {stats.total}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '3px solid #4ade80' }}>
          <span style={{ fontSize: '0.85rem', color: '#4ade80', textTransform: 'uppercase', fontWeight: 600 }}>Confirmados (Pagos)</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#4ade80', marginTop: '0.2rem' }}>
            {stats.paid}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '3px solid var(--primary)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 600 }}>Aguardando Pagamento</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
            {stats.pending}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '3px solid #60a5fa' }}>
          <span style={{ fontSize: '0.85rem', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 600 }}>Check-ins Realizados</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.2rem' }}>
            {stats.scanned} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/ {stats.paid}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between mobile-col gap-4">
          
          {/* Abas de Filtro */}
          <div className="flex gap-2 mobile-col">
            <button
              onClick={() => setFilter('ALL')}
              style={{
                background: filter === 'ALL' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: filter === 'ALL' ? '#000' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter('PAID')}
              style={{
                background: filter === 'PAID' ? '#4ade80' : 'rgba(255,255,255,0.05)',
                color: filter === 'PAID' ? '#000' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Pagos ({stats.paid})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              style={{
                background: filter === 'PENDING' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: filter === 'PENDING' ? '#000' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Aguardando ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('SCANNED')}
              style={{
                background: filter === 'SCANNED' ? '#60a5fa' : 'rgba(255,255,255,0.05)',
                color: filter === 'SCANNED' ? '#000' : '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Presentes ({stats.scanned})
            </button>
          </div>

          {/* Campo de Busca e Botão Atualizar */}
          <div className="flex gap-2 items-center" style={{ flex: 1, maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou credencial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2.4rem', fontSize: '0.9rem', padding: '0.6rem 0.8rem 0.6rem 2.4rem' }}
              />
            </div>

            <button
              onClick={fetchTickets}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.6rem 0.8rem' }}
              title="Atualizar lista em tempo real"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* Tabela de Ingressos */}
      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.8rem 1rem' }}>PARTICIPANTE</th>
              <th style={{ padding: '0.8rem 1rem' }}>CPF / CONTATO</th>
              <th style={{ padding: '0.8rem 1rem' }}>CREDENCIAL</th>
              <th style={{ padding: '0.8rem 1rem' }}>PAGAMENTO</th>
              <th style={{ padding: '0.8rem 1rem' }}>STATUS ENTRADA</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                  Nenhum ingresso encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: ticket.scanned ? 'rgba(74, 222, 128, 0.05)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  {/* Participante */}
                  <td style={{ padding: '1rem' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#fff', display: 'block' }}>
                      {ticket.user.name}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                      {ticket.user.email}
                    </span>
                  </td>

                  {/* CPF / Contato */}
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>
                    <div>{ticket.user.cpf}</div>
                    {ticket.user.phone && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        {ticket.user.phone}
                      </span>
                    )}
                  </td>

                  {/* Credencial */}
                  <td style={{ padding: '1rem' }}>
                    <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', fontSize: '0.85rem' }}>
                      #{ticket.id.substring(0, 8).toUpperCase()}
                    </code>
                  </td>

                  {/* Status Pagamento */}
                  <td style={{ padding: '1rem' }}>
                    {ticket.status === 'PAID' ? (
                      <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.25rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                        PAGO
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(223, 186, 82, 0.15)', color: 'var(--primary)', padding: '0.25rem 0.7rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                        AGUARDANDO
                      </span>
                    )}
                  </td>

                  {/* Status Entrada */}
                  <td style={{ padding: '1rem' }}>
                    {ticket.scanned ? (
                      <div className="flex items-center gap-2" style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        Presente ({ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'OK'})
                      </div>
                    ) : (
                      <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                        <Clock size={16} />
                        Não Entrou
                      </div>
                    )}
                  </td>

                  {/* Ação Check-in Manual */}
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleManualCheckin(ticket.id, ticket.scanned)}
                      style={{
                        background: ticket.scanned ? 'rgba(239, 68, 68, 0.15)' : (ticket.status === 'PAID' ? '#4ade80' : 'var(--primary)'),
                        color: ticket.scanned ? '#f87171' : '#000',
                        border: ticket.scanned ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {ticket.scanned ? 'Desfazer Entrada' : (ticket.status === 'PAID' ? 'Confirmar Entrada' : 'Liberar Entrada')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL SCANNER DE QR CODE */}
      {scannerOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-panel animate-scale-in flex flex-col items-center" style={{ width: '100%', maxWidth: '520px', position: 'relative', padding: '2rem' }}>
            
            {/* Fechar Modal */}
            <button 
              onClick={closeScannerModal}
              style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.6rem', color: '#fff', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode color="var(--primary)" size={24} />
              Validador de QR Code
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Aponte a câmera ou use o leitor/bipador USB na credencial do participante.
            </p>

            {/* Container da Câmera */}
            <div 
              id="qr-reader-container"
              ref={scannerContainerRef}
              style={{ 
                width: '100%', 
                maxWidth: '300px', 
                height: cameraActive ? '300px' : '0px', 
                overflow: 'hidden',
                borderRadius: '16px',
                marginBottom: cameraActive ? '1rem' : '0',
                background: '#000'
              }}
            />

            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', marginBottom: '1.5rem' }}
              >
                <Camera size={20} color="var(--primary)" />
                Ativar Câmera do Dispositivo
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}
              >
                Desativar Câmera
              </button>
            )}

            {/* Campo de Leitura para Bipador USB ou Digitação Manual */}
            <form 
              onSubmit={(e) => { e.preventDefault(); processScan(scanInput); }} 
              style={{ width: '100%', marginBottom: '1.5rem' }}
            >
              <div className="flex gap-2">
                <input
                  ref={scanInputRef}
                  type="text"
                  placeholder="Bipe com leitor USB ou digite o código..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.95rem', padding: '0.8rem 1rem', flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={scanLoading || !scanInput.trim()}
                  className="btn-primary"
                  style={{ padding: '0.8rem 1.5rem' }}
                >
                  {scanLoading ? 'Bipando...' : 'Confirmar'}
                </button>
              </div>
            </form>

            {/* Card de Resultado do Scan */}
            {scanResult && (
              <div 
                className="animate-scale-in"
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  borderRadius: '12px',
                  background: scanResult.type === 'success' 
                    ? 'rgba(74, 222, 128, 0.15)' 
                    : (scanResult.type === 'warning' ? 'rgba(223, 186, 82, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                  border: `1px solid ${scanResult.type === 'success' ? '#4ade80' : (scanResult.type === 'warning' ? 'var(--primary)' : '#ef4444')}`,
                  textAlign: 'center'
                }}
              >
                {scanResult.type === 'success' && <CheckCircle2 size={36} color="#4ade80" style={{ margin: '0 auto 0.5rem' }} />}
                {scanResult.type === 'warning' && <AlertTriangle size={36} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />}
                {scanResult.type === 'error' && <XCircle size={36} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />}

                <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: '0 0 0.3rem' }}>
                  {scanResult.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 0.5rem' }}>
                  {scanResult.message}
                </p>

                {scanResult.ticket && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', color: '#fff', marginTop: '0.5rem' }}>
                    <strong>{scanResult.ticket.name}</strong> • CPF: {scanResult.ticket.cpf}
                  </div>
                )}

                {scanResult.canForce && (
                  <button
                    onClick={() => processScan(scanResult.ticket.id, true)}
                    className="btn-primary"
                    style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Liberar Entrada Mesmo Assim (Pago no Local)
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              💡 Assim que bipar com sucesso, a lista ao fundo é atualizada automaticamente em tempo real.
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
