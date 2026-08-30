import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy, Check, RefreshCw } from 'lucide-react';

interface ConviteProps {
  userId: string;
  casalId: string;
  onClose: () => void;
}

export function Convite({ userId, casalId, onClose }: ConviteProps) {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [parceiroPendente, setParceiroPendente] = useState(true);

  useEffect(() => {
    verificarParceiro();
    buscarConviteAtivo();
  }, [casalId]);

  const verificarParceiro = async () => {
    const { data } = await supabase
      .from('membros')
      .select('user_id')
      .eq('casal_id', casalId);
    if (data && data.length >= 2) setParceiroPendente(false);
  };

  const buscarConviteAtivo = async () => {
    const { data } = await supabase
      .from('convites')
      .select('token_hash, expira_em')
      .eq('casal_id', casalId)
      .is('usado_em', null)
      .gte('expira_em', new Date().toISOString())
      .order('criado_em', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCodigo(data.token_hash);
    } else {
      await gerarNovoConvite();
    }
  };

  const gerarNovoConvite = async () => {
    setGerando(true);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let novo = '';
    for (let i = 0; i < 6; i++) novo += chars.charAt(Math.floor(Math.random() * chars.length));

    const expira = new Date();
    expira.setDate(expira.getDate() + 7);

    const { error } = await supabase.from('convites').insert({
      casal_id: casalId,
      token_hash: novo,
      criado_por: userId,
      expira_em: expira.toISOString(),
    });

    if (!error) setCodigo(novo);
    setGerando(false);
  };

  const copiar = () => {
    navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const appUrl = 'https://cofre-a-dois-app.vercel.app';
  const mensagem = `Olá! Te convidei para o nosso Cofre a Dois 💛\n\nÉ o nosso app de finanças compartilhadas.\n\n👉 Acesse: ${appUrl}\n📌 Código do convite: *${codigo}*\n\nCria sua conta e usa o código para entrar no nosso cofre!`;

  const compartilharWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const compartilharNativo = () => {
    if (navigator.share) {
      navigator.share({ title: 'Cofre a Dois', text: mensagem, url: appUrl });
    }
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />

      <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px' }}>
        <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Convidar parceiro</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A8578' }}>
              {parceiroPendente ? 'Seu cofre está esperando pelo segundo membro' : 'Vocês dois já estão no cofre ✓'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <X size={22} />
          </button>
        </div>

        {/* Código */}
        <div style={{ backgroundColor: '#050505', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center', position: 'relative' }}>
          <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Código de convite</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, letterSpacing: '0.15em', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {gerando ? '......' : codigo}
            </span>
            <button onClick={copiar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiado ? '#3FA96A' : '#8A8578' }}>
              {copiado ? <Check size={22} /> : <Copy size={22} />}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#8A8578', margin: '8px 0 0' }}>Válido por 7 dias</p>

          <button onClick={gerarNovoConvite} disabled={gerando} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <RefreshCw size={13} style={{ animation: gerando ? 'spin 1s linear infinite' : 'none' }} />
            Novo
          </button>
        </div>

        {/* Instruções */}
        <div style={{ backgroundColor: '#111', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#8A8578', margin: 0, lineHeight: 1.6 }}>
            Seu par precisa: <span style={{ color: '#F2EFE6' }}>1.</span> Criar uma conta no app &nbsp;
            <span style={{ color: '#F2EFE6' }}>2.</span> Clicar em "Entrar com convite" &nbsp;
            <span style={{ color: '#F2EFE6' }}>3.</span> Digitar o código acima
          </p>
        </div>

        {/* Botões de compartilhamento */}
        <p style={{ fontSize: 12, color: '#8A8578', margin: '0 0 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Compartilhar via</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* WhatsApp */}
          <button onClick={compartilharWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', backgroundColor: '#075E54', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Enviar pelo WhatsApp</span>
          </button>

          {/* Copiar mensagem */}
          <button onClick={copiarLink} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
            {copiado ? <Check size={22} color="#3FA96A" /> : <Copy size={22} color="#D4AF37" />}
            <span style={{ color: '#F2EFE6', fontSize: 15, fontWeight: 500 }}>{copiado ? 'Mensagem copiada!' : 'Copiar mensagem completa'}</span>
          </button>

          {/* Compartilhamento nativo (mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={compartilharNativo} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span style={{ color: '#F2EFE6', fontSize: 15, fontWeight: 500 }}>Outras opções</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
