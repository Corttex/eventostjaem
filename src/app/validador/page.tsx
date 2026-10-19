'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Camera, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, 
  Shield, Volume2, VolumeX, Keyboard, RefreshCw, Check, Clock
} from 'lucide-react';

interface RecentScan {
  id: string;
  name: string;
  cpf: string;
  time: string;
  ticketType: string;
  status: string;
}

export default function ValidadorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner & Câmera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const html5QrCodeRef = useRef<any>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Som de Validação
  const playAudioTone = (type: 'success' | 'warning' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(450, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem('validador_auth');
    if (isAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === '807522' || pin.trim() === '222222') {
      sessionStorage.setItem('validador_auth', 'true');
      setIsAuthenticated(true);
    } else {
      alert('PIN Incorreto. Utilize o PIN de portaria (807522 ou 222222).');
    }
  };

  // Inicializar Leitor de Câmera
  useEffect(() => {
    if (!isAuthenticated) return;

    let qrScanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        qrScanner = new Html5Qrcode('qr-reader-live');
        html5QrCodeRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            handleScanToken(decodedText);
          },
          () => {
            // scan callback silencioso
          }
        );
        setCameraActive(true);
        setCameraError(null);
      } catch (err: any) {
        console.warn('Falha ao iniciar câmera automática:', err);
        setCameraActive(false);
        setCameraError('Câmera indisponível ou permissão pendente. Utilize a digitação manual abaixo.');
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, [isAuthenticated]);

  // Função central para processar Token/Código QR
  const handleScanToken = async (token: string, forceConfirm: boolean = false) => {
    if (processing) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/validador/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), forceConfirm })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playAudioTone('success');
        setLastResult({
          type: 'SUCCESS',
          ticket: data.ticket,
          message: 'Entrada Autorizada com Sucesso!'
        });

        // Adicionar aos últimos check-ins
        setRecentScans(prev => [
          {
            id: data.ticket.id,
            name: data.ticket.name,
            cpf: data.ticket.cpf,
            ticketType: data.ticket.ticketType || 'VIP',
            time: new Date().toLocaleTimeString('pt-BR'),
            status: 'AUTORIZADO'
          },
          ...prev.slice(0, 7)
        ]);

        setManualCode('');
      } else if (data.alreadyScanned) {
        playAudioTone('error');
        setLastResult({
          type: 'ALREADY_SCANNED',
          ticket: data.ticket,
          message: data.error || 'Ingresso já utilizado anteriormente!'
        });
      } else if (data.isPending) {
        playAudioTone('warning');
        setLastResult({
          type: 'PENDING',
          ticket: data.ticket,
          token: token.trim(),
          message: 'Pagamento pendente no sistema. Liberar manualmente?'
        });
      } else {
        playAudioTone('error');
        setLastResult({
          type: 'ERROR',
          message: data.error || 'Ingresso inválido ou não encontrado!'
        });
      }
    } catch (err: any) {
      playAudioTone('error');
      setLastResult({
        type: 'ERROR',
        message: 'Falha de comunicação com o servidor de validação.'
      });
    } finally {
      setProcessing(false);
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 300);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanToken(manualCode);
  };

  // TELA DE AUTENTICAÇÃO PIN PORTARIA
  if (!isAuthenticated) {
    return (
      <main className="container flex items-center justify-center animate-fade-in" style={{ minHeight: '85vh', padding: '2rem' }}>
        <form onSubmit={handleLogin} className="glass-panel text-center flex flex-col gap-5" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
          <div style={{ margin: '0 auto', background: 'rgba(223, 186, 82, 0.12)', padding: '1.2rem', borderRadius: '50%', width: '75px', height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={38} color="var(--primary)" />
          </div>

          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#fff', margin: '0 0 0.5rem' }}>Validador de Portaria</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
              Leitura de QR Code e credenciamento oficial em tempo real
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', display: 'block' }}>PIN de Portaria</label>
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
            Entrar na Recepção
          </button>

          <Link href="/" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            ← Voltar para o portal do evento
          </Link>
        </form>
      </main>
    );
  }

  // TELA PRINCIPAL DO VALIDADOR (Fiel à imagem de referência da portaria)
  return (
    <main className="animate-fade-in" style={{ padding: '1.5rem 2.5rem 5rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <Link href="/admin" style={{ color: 'rgba(255,255,255,0.6)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Painel Administrativo
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.15)', 
              color: soundEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.4)', 
              padding: '0.4rem 0.8rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? 'Bip Ativo' : 'Mudo'}
          </button>

          <button 
            onClick={() => {
              sessionStorage.removeItem('validador_auth');
              setIsAuthenticated(false);
            }}
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Topo com Título Portaria e Posto de Acesso */}
      <div className="flex items-center justify-between tablet-col gap-4" style={{ marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(223, 186, 82, 0.85)', fontWeight: 700, marginBottom: '0.2rem' }}>
            PORTARIA & RECEPÇÃO • 30 ANOS DA LEI DE ARBITRAGEM
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="gold-gradient-text" style={{ fontSize: '2.4rem', margin: 0, lineHeight: 1.15 }}>
              Validador de Ingressos
            </h1>
            <span style={{ 
              background: 'rgba(74, 222, 128, 0.15)', 
              border: '1px solid #4ade80', 
              color: '#4ade80', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px' 
            }}>
              Online (PIN 807522)
            </span>
          </div>
        </div>

        {/* Status Câmera & Posto */}
        <div className="flex gap-4 items-center">
          <div style={{ 
            background: cameraActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.06)', 
            border: cameraActive ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.15)',
            color: cameraActive ? '#4ade80' : 'rgba(255,255,255,0.7)',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Camera size={18} /> {cameraActive ? 'Câmera Ativa' : 'Câmera Desligada'}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>
              POSTO DE ACESSO
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
              Portaria Principal A
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Leitor de QR Code / Câmera (Esquerda) + Últimos Check-ins (Direita) */}
      <div className="grid grid-cols-2 gap-6 tablet-col" style={{ marginBottom: '2rem' }}>
        
        {/* Painel da Câmera / Auto-Scan */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#4ade80', fontWeight: 800 }}>
              CÂMERA ATIVA • APONTE PARA O QR CODE DO INGRESSO
            </span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '4px', color: 'rgba(255,255,255,0.7)' }}>
              AUTO-SCAN
            </span>
          </div>

          {/* Viewfinder da Câmera */}
          <div 
            style={{ 
              width: '100%', 
              minHeight: '340px', 
              background: '#02040a', 
              borderRadius: '14px', 
              border: cameraActive ? '2px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(255,255,255,0.1)', 
              overflow: 'hidden', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              boxShadow: cameraActive ? '0 0 25px rgba(74, 222, 128, 0.15)' : 'none'
            }}
          >
            <div id="qr-reader-live" style={{ width: '100%', height: '100%' }}></div>

            {/* Alerta de erro da câmera se houver */}
            {cameraError && (
              <div style={{ position: 'absolute', padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                <Camera size={42} style={{ margin: '0 auto 0.8rem', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>{cameraError}</p>
              </div>
            )}

            {/* Linha de Scanner Animada */}
            {cameraActive && (
              <div 
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
                  boxShadow: '0 0 12px #4ade80',
                  animation: 'pulse 1.8s infinite ease-in-out',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        </div>

        {/* Painel de Últimos Check-ins na Portaria */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <Clock size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: '#fff' }}>
                ÚLTIMOS CHECK-INS NA PORTARIA
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              {recentScans.length} leituras
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '350px' }}>
            {recentScans.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '200px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center' }}>
                Nenhum ingresso validado nesta sessão ainda.
              </div>
            ) : (
              recentScans.map((scan, i) => (
                <div 
                  key={i} 
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '10px', 
                    padding: '0.75rem 1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>{scan.name}</strong>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                      CPF: {scan.cpf} • {scan.ticketType === 'VIP' ? 'VIP Ouro' : 'Padrão'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 800, display: 'block' }}>
                      ✓ {scan.status}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {scan.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Caixa de Digitação Manual ou Leitor USB */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem' }}>
          <Keyboard size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: '#fff' }}>
            DIGITAÇÃO MANUAL OU LEITOR USB
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
          Caso o convidado esteja com o voucher impresso ou QR Code danificado, digite o código do ingresso abaixo:
        </p>

        <form onSubmit={handleManualSubmit} className="flex gap-3 mobile-col">
          <input 
            ref={manualInputRef}
            type="text" 
            placeholder="Aproxime o leitor de QR ou digite o token..." 
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="input-field"
            style={{ 
              flex: 1, 
              padding: '1rem 1.2rem', 
              fontSize: '1rem', 
              background: '#080d1a', 
              border: '1px solid rgba(223, 186, 82, 0.4)' 
            }}
          />

          <button 
            type="submit" 
            disabled={processing}
            className="btn-primary"
            style={{ padding: '1rem 2rem', fontSize: '0.95rem', minWidth: '240px' }}
          >
            {processing ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Check size={18} /> VALIDAR ENTRADA / CHECK-IN
              </>
            )}
          </button>
        </form>
      </div>

      {/* MODAL DE RESULTADO DO SCANNER */}
      {lastResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div 
            className="glass-panel text-center animate-scale-in"
            style={{ 
              maxWidth: '520px', 
              width: '100%', 
              padding: '2.5rem',
              border: lastResult.type === 'SUCCESS' ? '2px solid #4ade80' : lastResult.type === 'PENDING' ? '2px solid #facc15' : '2px solid #f87171'
            }}
          >
            {lastResult.type === 'SUCCESS' && (
              <>
                <div style={{ margin: '0 auto 1.2rem', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={42} color="#4ade80" />
                </div>
                <h2 style={{ color: '#4ade80', fontSize: '1.8rem', margin: '0 0 0.5rem' }}>ENTRADA AUTORIZADA!</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '1.5rem' }}>{lastResult.message}</p>
                
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.2rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>PARTICIPANTE</div>
                  <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>{lastResult.ticket.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>CPF: {lastResult.ticket.cpf}</div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 600 }}>
                    Categoria: {lastResult.ticket.ticketType === 'VIP' ? '★ VIP Ouro (com Café 08h)' : '✓ Padrão'}
                  </div>
                </div>

                <button 
                  onClick={() => setLastResult(null)}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '0.9rem' }}
                >
                  OK, Próximo Participante
                </button>
              </>
            )}

            {lastResult.type === 'ALREADY_SCANNED' && (
              <>
                <div style={{ margin: '0 auto 1.2rem', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(248, 113, 113, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={42} color="#f87171" />
                </div>
                <h2 style={{ color: '#f87171', fontSize: '1.8rem', margin: '0 0 0.5rem' }}>INGRESSO JÁ UTILIZADO!</h2>
                <p style={{ color: '#fca5a5', fontSize: '1rem', marginBottom: '1.5rem' }}>{lastResult.message}</p>
                
                {lastResult.ticket && (
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.2rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{lastResult.ticket.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>CPF: {lastResult.ticket.cpf}</div>
                  </div>
                )}

                <button 
                  onClick={() => setLastResult(null)}
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '0.9rem', borderColor: '#f87171', color: '#f87171' }}
                >
                  Fechar Alerta
                </button>
              </>
            )}

            {lastResult.type === 'PENDING' && (
              <>
                <div style={{ margin: '0 auto 1.2rem', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(250, 204, 21, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={42} color="#facc15" />
                </div>
                <h2 style={{ color: '#facc15', fontSize: '1.8rem', margin: '0 0 0.5rem' }}>PAGAMENTO PENDENTE</h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{lastResult.message}</p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleScanToken(lastResult.token, true)}
                    className="btn-primary" 
                    style={{ flex: 1, padding: '0.9rem', background: '#facc15', color: '#000' }}
                  >
                    Liberar Entrada Mesmo Assim
                  </button>
                  <button 
                    onClick={() => setLastResult(null)}
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '0.9rem' }}
                  >
                    Barrar Entrada
                  </button>
                </div>
              </>
            )}

            {lastResult.type === 'ERROR' && (
              <>
                <div style={{ margin: '0 auto 1.2rem', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(248, 113, 113, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={42} color="#f87171" />
                </div>
                <h2 style={{ color: '#f87171', fontSize: '1.8rem', margin: '0 0 0.5rem' }}>INGRESSO INVÁLIDO</h2>
                <p style={{ color: '#fca5a5', fontSize: '1rem', marginBottom: '1.5rem' }}>{lastResult.message}</p>

                <button 
                  onClick={() => setLastResult(null)}
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '0.9rem' }}
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
