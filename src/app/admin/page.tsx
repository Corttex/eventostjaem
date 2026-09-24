'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchTickets = () => {
    fetch('/api/admin/tickets')
      .then(res => res.json())
      .then(data => {
        if(data.tickets) setTickets(data.tickets);
      })
      .catch(() => console.log('Sem dados ainda'));
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
    if (pin === '807522') {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      fetchTickets();
    } else {
      alert('PIN Incorreto');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center animate-fade-in" style={{ minHeight: '80vh' }}>
        <form onSubmit={handleLogin} className="glass-panel text-center flex flex-col gap-4" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>Acesso Restrito</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>Digite o PIN para acessar o painel</p>
          <input 
            type="password" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN de Acesso" 
            className="input-field text-center" 
            style={{ fontSize: '1.5rem', letterSpacing: '4px' }}
            maxLength={6}
            required 
          />
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
      </main>
    );
  }

  const handleManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/admin/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Ingresso gerado com sucesso!');
        (e.target as HTMLFormElement).reset();
        fetchTickets(); // Atualiza a lista
      } else {
        alert('Erro ao gerar ingresso.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
    setLoading(false);
  };

  return (
    <main className="container animate-fade-in" style={{ padding: '4rem 0' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Painel Administrativo</h1>
      
      <div className="grid grid-cols-3">
        <div className="glass-panel text-center">
          <h3>Total de Ingressos</h3>
          <p className="gold-gradient-text" style={{ fontSize: '3rem', margin: '1rem 0' }}>{tickets.length}</p>
        </div>
        <div className="glass-panel text-center">
          <h3>Confirmados</h3>
          <p className="gold-gradient-text" style={{ fontSize: '3rem', margin: '1rem 0' }}>
            {tickets.filter(t => t.status === 'PAID' || t.status === 'PENDING').length}
          </p>
        </div>
        <div className="glass-panel text-center">
          <h3>Faturamento (R$)</h3>
          <p className="gold-gradient-text" style={{ fontSize: '3rem', margin: '1rem 0' }}>
            {tickets.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Emitir Ingresso Manual (Cortesia / Outros Pagamentos)</h3>
        <form onSubmit={handleManualTicket} className="flex gap-4 items-center mobile-col">
          <input type="text" name="name" placeholder="Nome do Participante" className="input-field" required style={{ flex: 1 }} />
          <input type="email" name="email" placeholder="E-mail" className="input-field" required style={{ flex: 1 }} />
          <input type="text" name="cpf" placeholder="CPF" className="input-field" required style={{ flex: 1 }} />
          <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? 'Emitindo...' : 'Gerar Ingresso'}
          </button>
        </form>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem' }}>Inscritos Recentes</h3>
        
        {tickets.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>
            Nenhum ingresso gerado ainda. Faça um cadastro de teste na página inicial!
          </p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--primary)', color: 'var(--primary)' }}>
                <th style={{ padding: '1rem 0' }}>Nome</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Ingresso (PDF)</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '1rem 0' }}>{ticket.user?.name}</td>
                  <td>{ticket.user?.cpf}</td>
                  <td>{ticket.status}</td>
                  <td>
                    <Link href={`/api/ticket/${ticket.id}`} target="_blank" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                      Baixar PDF
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
