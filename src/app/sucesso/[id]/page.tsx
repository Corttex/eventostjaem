'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, FileText, QrCode, Copy, ExternalLink, RefreshCw, AlertCircle, ArrowLeft, Download } from 'lucide-react';

interface TicketInfo {
  id: string;
  name: string;
  cpf: string;
  email: string;
  status: string;
}

export default function SucessoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados salvos da última transação (caso PIX direto)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('tjaem_last_payment');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.paymentId === id || parsed.primaryTicketId === id) {
          setPaymentDetails(parsed);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  // Função para verificar status do pagamento
  const checkStatus = async (showFeedback = false) => {
    if (!id) return;
    if (showFeedback) setCheckingPayment(true);

    try {
      const res = await fetch(`/api/check-payment?${id.startsWith('pay_') ? 'paymentId=' + id : 'ticketId=' + id}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data.tickets && data.tickets.length > 0) {
          setTickets(data.tickets);
        }

        if (data.paid || data.status === 'RECEIVED' || data.status === 'CONFIRMED') {
          setIsPaid(true);
        }

        // Atualiza os dados de pagamento (incluindo PIX QR code caso não estivesse em cache)
        setPaymentDetails((prev: any) => ({
          ...prev,
          invoiceUrl: data.invoiceUrl || prev?.invoiceUrl || prev?.paymentUrl,
          bankSlipUrl: data.bankSlipUrl || prev?.bankSlipUrl,
          totalAmount: data.value || prev?.totalAmount,
          pixQrCode: data.pixQrCode || prev?.pixQrCode
        }));
      } else {
        const err = await res.json().catch(() => null);
        if (showFeedback) {
          setError(err?.error || 'Não foi possível atualizar o status no momento.');
        }
      }
    } catch (err: any) {
      if (showFeedback) setError('Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
      if (showFeedback) setCheckingPayment(false);
    }
  };

  // Efeito inicial e Polling a cada 5 segundos enquanto não estiver pago
  useEffect(() => {
    checkStatus(false);

    if (!isPaid) {
      const interval = setInterval(() => {
        checkStatus(false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [id, isPaid]);

  const copyPixCode = () => {
    const code = paymentDetails?.pixQrCode?.payload;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading && tickets.length === 0) {
    return (
      <main className="container flex items-center justify-center" style={{ minHeight: '80vh' }}>
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <RefreshCw className="animate-spin" size={48} color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ color: '#fff' }}>Carregando dados da sua inscrição...</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Consultando o portal de pagamentos Asaas.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container flex flex-col items-center justify-center animate-fade-up" style={{ minHeight: '90vh', padding: '3rem 1rem 6rem', maxWidth: '720px' }}>
      
      {/* Botão de Retorno */}
      <div style={{ width: '100%', marginBottom: '1.5rem' }}>
        <Link href="/" className="flex items-center gap-2" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Voltar para a página inicial
        </Link>
      </div>

      <div className="glass-panel text-center" style={{ width: '100%', padding: '2.5rem', border: isPaid ? '2px solid #4ade80' : '1px solid var(--primary)' }}>
        
        {/* Ícone e Cabeçalho de Status */}
        {isPaid ? (
          <div>
            <CheckCircle2 color="#4ade80" size={72} style={{ margin: '0 auto 1.2rem' }} />
            <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Pagamento Aprovado
            </span>
            <h1 className="gold-gradient-text" style={{ fontSize: '2.4rem', margin: '0.8rem 0 0.5rem' }}>
              Inscrição Confirmada!
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.85)', marginBottom: '2rem' }}>
              Seus ingressos oficiais com QR Code foram gerados e já estão prontos para download.
            </p>
          </div>
        ) : (
          <div>
            <Clock color="var(--primary)" size={64} style={{ margin: '0 auto 1.2rem' }} />
            <span style={{ background: 'rgba(223, 186, 82, 0.15)', color: 'var(--primary)', padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Aguardando Compensação do Pagamento
            </span>
            <h1 style={{ fontSize: '2.2rem', margin: '0.8rem 0 0.5rem', color: '#fff' }}>
              Inscrição Pré-Registrada!
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.8rem' }}>
              Conclua o pagamento para ativar a validade e liberar o download dos seus ingressos.
            </p>
          </div>
        )}

        {/* Bloco de Pagamento Pendente (PIX / Boleto / Cartão) */}
        {!isPaid && (
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.8rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid rgba(223, 186, 82, 0.2)' }}>
            
            {/* Se houver QR Code do PIX disponível */}
            {paymentDetails?.pixQrCode?.encodedImage && (
              <div className="flex flex-col items-center" style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                  Pague com PIX para Aprovação Instantânea
                </p>

                {/* Imagem do QR Code em Card com Cantos Arredondados */}
                <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                  <img
                    src={`data:image/png;base64,${paymentDetails.pixQrCode.encodedImage}`}
                    alt="QR Code PIX Asaas"
                    style={{ width: '200px', height: '200px', display: 'block', borderRadius: '8px' }}
                  />
                </div>

                {/* Código Copia e Cola */}
                {paymentDetails?.pixQrCode?.payload && (
                  <div style={{ width: '100%', maxWidth: '520px', marginTop: '1.2rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                      Ou copie o código PIX Copia e Cola:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={paymentDetails.pixQrCode.payload}
                        className="input-field"
                        style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={copyPixCode}
                        className="btn-primary"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Copy size={16} />
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Links para Fatura Asaas / Boleto */}
            <div className="flex gap-3 justify-center mobile-col" style={{ marginTop: '1.2rem' }}>
              {(paymentDetails?.invoiceUrl || paymentDetails?.paymentUrl) && (
                <a
                  href={paymentDetails.invoiceUrl || paymentDetails.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
                >
                  <ExternalLink size={16} />
                  Abrir Fatura no Asaas
                </a>
              )}

              {paymentDetails?.bankSlipUrl && (
                <a
                  href={paymentDetails.bankSlipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
                >
                  <FileText size={16} />
                  Imprimir Boleto
                </a>
              )}
            </div>

            {/* Botão de Verificação Manual */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.2rem' }}>
              <button
                type="button"
                onClick={() => checkStatus(true)}
                disabled={checkingPayment}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 2rem' }}
              >
                <RefreshCw size={18} className={checkingPayment ? 'animate-spin' : ''} />
                {checkingPayment ? 'Verificando no Asaas...' : 'Já Realizei o Pagamento'}
              </button>
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                Esta tela atualiza automaticamente assim que o pagamento for detectado.
              </p>
            </div>
          </div>
        )}

        {/* Bloco de Ingressos (Mostra sempre, informando se está Pago ou Aguardando Pagamento) */}
        {tickets.length > 0 && (
          <div style={{ 
            background: 'rgba(0,0,0,0.4)', 
            padding: '1.8rem', 
            borderRadius: '16px', 
            marginBottom: '2rem', 
            textAlign: 'left', 
            border: isPaid ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(223, 186, 82, 0.3)' 
          }}>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={22} />
              Meus Ingressos ({tickets.length}):
            </h3>

            <div className="flex flex-col gap-4">
              {tickets.map((t, idx) => {
                const ticketPaid = t.status === 'PAID' || isPaid;
                return (
                  <div
                    key={t.id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      border: ticketPaid ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(223, 186, 82, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}
                    className="mobile-col"
                  >
                    <div>
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Ingresso {idx + 1}
                        </span>
                        {ticketPaid ? (
                          <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', fontSize: '0.75rem', padding: '0.15rem 0.6rem', borderRadius: '10px', fontWeight: 700 }}>
                            PAGO
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(223, 186, 82, 0.15)', color: 'var(--primary)', fontSize: '0.75rem', padding: '0.15rem 0.6rem', borderRadius: '10px', fontWeight: 700 }}>
                            AGUARDANDO PAGAMENTO
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '1.15rem', color: '#fff', margin: '0.2rem 0' }}>
                        {t.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        CPF: {t.cpf} • E-mail: {t.email}
                      </p>
                    </div>

                    {ticketPaid ? (
                      <a
                        href={`/api/ticket/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.8rem 1.4rem',
                          fontSize: '0.95rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Download size={18} />
                        Baixar PDF
                      </a>
                    ) : (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem', 
                          padding: '0.6rem 1rem', 
                          background: 'rgba(223, 186, 82, 0.1)', 
                          color: 'var(--primary)', 
                          borderRadius: '8px', 
                          fontSize: '0.85rem', 
                          fontWeight: 600 
                        }}>
                          <Clock size={16} />
                          Aguardando Pagamento
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Orientações Gerais */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.4rem', borderRadius: '12px', textAlign: 'left', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: '0.4rem' }}>
            Informações Importantes:
          </strong>
          <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
            <li>No dia do evento, apresente o QR Code no seu celular ou impresso na portaria.</li>
            <li>O local do evento será no SGAS quadra 603 Sul, L2 Sul — Asa Sul, Brasília / DF, das 09h às 17h.</li>
            <li>Para dúvidas ou suporte à sua credencial, contate o TJAEM Brasil.</li>
          </ul>
        </div>

      </div>
    </main>
  );
}
