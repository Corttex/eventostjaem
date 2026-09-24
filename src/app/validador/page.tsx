'use client';
import { useState, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle } from 'lucide-react';

export default function ValidadorPage() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('validador_auth');
    if (isAuth === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '807522') {
      sessionStorage.setItem('validador_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert('PIN Incorreto');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center animate-fade-in" style={{ minHeight: '80vh' }}>
        <form onSubmit={handleLogin} className="glass-panel text-center flex flex-col gap-4" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)' }}>Acesso Validador</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>Digite o PIN para liberar o escaneamento</p>
          <input 
            type="password" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN" 
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

  return (
    <main className="container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh', padding: '2rem' }}>
      <div className="glass-panel flex flex-col items-center" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Validador de Ingressos</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
          Aponte a câmera para o QR Code do ingresso do participante para realizar o Check-in.
        </p>

        <div 
          style={{ 
            width: '250px', 
            height: '250px', 
            border: '2px dashed var(--primary)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}
        >
          <QrCode size={64} color="var(--primary)" opacity={0.5} />
        </div>

        <button className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={() => setStatus('success')}>
          Simular Leitura Válida
        </button>

        {status === 'success' && (
          <div className="animate-fade-in flex items-center justify-center gap-2" style={{ color: '#4ade80', marginTop: '1rem' }}>
            <CheckCircle size={24} />
            <strong style={{ fontSize: '1.2rem' }}>Check-in Realizado com Sucesso!</strong>
          </div>
        )}
      </div>
    </main>
  );
}
