import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy, Check, RefreshCw, UserX, Shield, User } from 'lucide-react';

interface ConviteProps {
  userId: string;
  casalId: string;
  onClose: () => void;
}

interface Membro {
  user_id: string;
  apelido: string | null;
  cor: string | null;
  entrou_em: string;
  email?: string;
  eh_dono?: boolean;
}

export function Convite({ userId, casalId, onClose }: ConviteProps) {
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [donoCasalId, setDonoCasalId] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const ehDono = donoCasalId === userId;

  useEffect(() => {
    carregarDados();
    buscarConviteAtivo();
  }, [casalId]);

  const carregarDados = async () => {
    // Buscar dono do cofre
    const { data: casal } = await supabase
      .from('casais')
      .select('criado_por')
      .eq('id', casalId)
      .single();

    if (casal) setDonoCasalId(casal.criado_por);

    // Buscar membros com dados de auth
    const { data: mems } = await supabase
      .from('membros')
      .select('user_id, apelido, cor, entrou_em')
      .eq('casal_id', casalId);

    if (mems && casal) {
      // Buscar e-mails via função RPC ou profiles
      const membrosComEmail = await Promise.all(
        mems.map(async (m) => {
          // Tentar buscar perfil
          const { data: profile } = await supabase
            .from('membros')
            .select('user_id')
            .eq('user_id', m.user_id)
            .single();

          return {
            ...m,
            eh_dono: m.user_id === casal.criado_por,
            email: m.user_id === userId ? 'Você' : 'Parceiro(a)',
          };
        })
      );
      setMembros(membrosComEmail);
    }
  };

  const buscarConviteAtivo = async () => {
    const { data } = await supabase
      .from('convites')
      .select('token_hash')
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

    await supabase.from('convites').insert({
      casal_id: casalId,
      token_hash: novo,
      criado_por: userId,
      expira_em: expira.toISOString(),
    });

    setCodigo(novo);
    setGerando(false);
  };

  const removerMembro = async (membroId: string) => {
    if (!ehDono || membroId === userId) return;
    setRemovendo(membroId);

    try {
      // Remover da tabela membros
      await supabase
        .from('membros')
        .delete()
        .eq('casal_id', casalId)
        .eq('user_id', membroId);

      // Invalidar todos os convites usados para abrir novo slot
      await supabase
        .from('convites')
        .update({ usado_em: null, usado_por: null })
        .eq('casal_id', casalId)
        .not('usado_em', 'is', null);

      // Gerar novo convite automaticamente
      await gerarNovoConvite();

      // Atualizar lista
      setMembros(prev => prev.filter(m => m.user_id !== membroId));
      setConfirmando(null);

      alert('Membro removido. Um novo código de convite foi gerado automaticamente.');
    } catch (err) {
      console.error(err);
    } finally {
      setRemovendo(null);
    }
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

  const copiarMensagem = () => {
    navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartilharNativo = () => {
    if (navigator.share) {
      navigator.share({ title: 'Cofre a Dois', text: mensagem, url: appUrl });
    }
  };

  const parceiroPendente = membros.length < 2;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />

      <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Gerenciar cofre</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A8578' }}>
              {parceiroPendente ? 'Aguardando segundo membro' : '2 pessoas no cofre'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <X size={22} />
          </button>
        </div>

        {/* Membros do cofre */}
        <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 14, padding: '14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#8A8578', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Membros</p>

          {membros.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8578', textAlign: 'center', padding: '8px 0' }}>Carregando...</p>
          ) : (
            membros.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: m.cor || '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {m.eh_dono
                    ? <Shield size={16} color="#050505" />
                    : <User size={16} color="#050505" />
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: '#F2EFE6', margin: 0, fontWeight: 500 }}>
                    {m.email}
                    {m.eh_dono && (
                      <span style={{ marginLeft: 8, fontSize: 10, backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        DONO
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0' }}>
                    Entrou em {new Date(m.entrou_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Botão remover — só dono vê, só em membros que não são ele */}
                {ehDono && !m.eh_dono && (
                  confirmando === m.user_id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => removerMembro(m.user_id)}
                        disabled={removendo === m.user_id}
                        style={{ padding: '6px 10px', backgroundColor: '#C2453D', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        {removendo === m.user_id ? '...' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setConfirmando(null)}
                        style={{ padding: '6px 10px', backgroundColor: '#222', border: 'none', borderRadius: 8, color: '#8A8578', fontSize: 12, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmando(m.user_id)}
                      style={{ background: 'none', border: '1px solid rgba(194,69,61,0.3)', borderRadius: 8, cursor: 'pointer', color: '#C2453D', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                    >
                      <UserX size={14} /> Remover
                    </button>
                  )
                )}
              </div>
            ))
          )}

          {parceiroPendente && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#1a1a1a', border: '1px dashed rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="#8A8578" />
              </div>
              <p style={{ fontSize: 13, color: '#8A8578', margin: 0 }}>Aguardando parceiro(a)...</p>
            </div>
          )}
        </div>

        {/* Código de convite — só mostra se tiver slot disponível */}
        {parceiroPendente && (
          <>
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
              <p style={{ fontSize: 11, color: '#8A8578', margin: '8px 0 0' }}>Válido por 7 dias · Uso único</p>

              <button onClick={gerarNovoConvite} disabled={gerando} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <RefreshCw size={13} />
                Novo
              </button>
            </div>

            <div style={{ backgroundColor: '#111', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#8A8578', margin: 0, lineHeight: 1.6 }}>
                Seu par precisa: <span style={{ color: '#F2EFE6' }}>1.</span> Criar conta &nbsp;
                <span style={{ color: '#F2EFE6' }}>2.</span> Clicar em "Entrar com convite" &nbsp;
                <span style={{ color: '#F2EFE6' }}>3.</span> Digitar o código
              </p>
            </div>

            <p style={{ fontSize: 12, color: '#8A8578', margin: '0 0 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Compartilhar via</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={compartilharWhatsApp} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', backgroundColor: '#075E54', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>Enviar pelo WhatsApp</span>
              </button>

              <button onClick={copiarMensagem} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
                {copiado ? <Check size={22} color="#3FA96A" /> : <Copy size={22} color="#D4AF37" />}
                <span style={{ color: '#F2EFE6', fontSize: 15, fontWeight: 500 }}>{copiado ? 'Copiado!' : 'Copiar mensagem'}</span>
              </button>

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
          </>
        )}

        {/* Cofre cheio — só dono vê opção de remover */}
        {!parceiroPendente && !ehDono && (
          <div style={{ backgroundColor: '#111', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#8A8578', margin: 0 }}>
              O cofre está completo. Apenas o dono pode remover membros.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
