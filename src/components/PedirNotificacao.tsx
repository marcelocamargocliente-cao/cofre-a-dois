import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { pedirPermissao, registrarSW } from '../lib/useNotificacoes';

export function PedirNotificacao() {
  const [mostrar, setMostrar] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (!('Notification' in window)) return;

    // Registrar SW silenciosamente
    registrarSW();

    // Mostrar banner se ainda não decidiu
    if (Notification.permission === 'default') {
      setTimeout(() => setMostrar(true), 3000); // Esperar 3s para não assustar
    } else if (Notification.permission === 'granted') {
      setStatus('granted');
    } else {
      setStatus('denied');
    }
  }, []);

  const solicitar = async () => {
    const ok = await pedirPermissao();
    setStatus(ok ? 'granted' : 'denied');
    setMostrar(false);
  };

  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: 16,
      right: 16,
      backgroundColor: '#111',
      border: '1px solid rgba(212,175,55,0.35)',
      borderRadius: 16,
      padding: '16px 16px 16px 20px',
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.15)',
      animation: 'slideUp 0.4s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Ícone */}
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bell size={18} color="#050505" />
      </div>

      {/* Texto */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, color: '#F2EFE6', margin: '0 0 3px', fontWeight: 600 }}>
          Ativar notificações
        </p>
        <p style={{ fontSize: 12, color: '#8A8578', margin: 0, lineHeight: 1.4 }}>
          Saiba quando seu par lançar um gasto ou responder a pergunta do dia
        </p>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={solicitar} style={{ padding: '7px 14px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 100%)', border: 'none', borderRadius: 8, color: '#050505', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Ativar
        </button>
        <button onClick={() => setMostrar(false)} style={{ padding: '6px 14px', background: 'transparent', border: 'none', color: '#8A8578', fontSize: 12, cursor: 'pointer' }}>
          Agora não
        </button>
      </div>

      {/* Fechar */}
      <button onClick={() => setMostrar(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#4a4640', padding: 2 }}>
        <X size={14} />
      </button>
    </div>
  );
}
