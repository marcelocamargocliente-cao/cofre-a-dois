import { supabase } from '../lib/supabase';
import { Lock, ExternalLink } from 'lucide-react';

interface AssinaturaRequeridaProps {
  onSignOut: () => void;
}

export function AssinaturaRequerida({ onSignOut }: AssinaturaRequeridaProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 40% 20%, #1a1200 0%, #050505 55%)',
    }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>

        <div style={{ textAlign: 'center' }}>
          <h1 className="titulo-principal gradiente-ouro-xl" style={{ marginBottom: 8 }}>
            COFRE<br />A DOIS
          </h1>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={24} color="#D4AF37" />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F2EFE6', margin: '0 0 8px' }}>
            Assinatura necessária
          </h2>
          <p style={{ fontSize: 14, color: '#8A8578', margin: '0 0 24px', lineHeight: 1.5 }}>
            Para acessar o Cofre a Dois você precisa de uma assinatura ativa.
          </p>

          <a
            href="https://pay.kiwify.com.br/cofre-a-dois"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '15px',
              background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)',
              border: 'none', borderRadius: 12, color: '#050505',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              textDecoration: 'none', boxSizing: 'border-box',
            }}
          >
            Assinar agora — R$ 14,90/mês
            <ExternalLink size={16} />
          </a>

          <div className="divisor-ouro" style={{ margin: '20px 0' }} />

          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8A8578' }}
          >
            Sair da conta
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#4a4640' }}>
          Já assinou? Aguarde alguns instantes e recarregue a página.
        </p>
      </div>
    </div>
  );
}
