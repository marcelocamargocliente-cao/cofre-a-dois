import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Send, Lock } from 'lucide-react';

interface NosProps {
  userId: string;
  casalId: string;
}

interface PerguntaDia {
  id: string;
  pergunta_id: string;
  data: string;
  perguntas: { texto: string; tema: string } | null;
}

interface Resposta {
  id: string;
  user_id: string;
  texto: string;
}

export function Nos({ userId, casalId }: NosProps) {
  const [pergunta, setPergunta] = useState<PerguntaDia | null>(null);
  const [minhaResposta, setMinhaResposta] = useState<Resposta | null>(null);
  const [respostaPartner, setRespostaPartner] = useState<Resposta | null>(null);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarPergunta(); }, [casalId, userId]);

  // Realtime — quando parceiro responder, revelar automaticamente
  useEffect(() => {
    if (!casalId) return;
    const channel = supabase
      .channel(`nos-${casalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'respostas',
        filter: `casal_id=eq.${casalId}`,
      }, () => { carregarPergunta(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casalId]);

  const carregarPergunta = async () => {
    const hoje = new Date().toISOString().split('T')[0];

    // Buscar pergunta do dia
    let { data: pdd } = await supabase
      .from('pergunta_do_dia')
      .select('*, perguntas(texto, tema)')
      .eq('casal_id', casalId)
      .eq('data', hoje)
      .single();

    // Se não existe, criar uma nova
    if (!pdd) {
      const { data: pergs } = await supabase
        .from('perguntas').select('id').eq('ativa', true).limit(50);

      if (pergs && pergs.length > 0) {
        const random = pergs[Math.floor(Math.random() * pergs.length)];
        const { data: nova } = await supabase
          .from('pergunta_do_dia')
          .insert({ casal_id: casalId, pergunta_id: random.id, data: hoje })
          .select('*, perguntas(texto, tema)')
          .single();
        pdd = nova;
      }
    }

    if (!pdd) { setLoading(false); return; }
    setPergunta(pdd);

    // Buscar respostas
    const { data: resps } = await supabase
      .from('respostas')
      .select('*')
      .eq('pergunta_do_dia_id', pdd.id);

    if (resps) {
      const minha = resps.find(r => r.user_id === userId);
      const partner = resps.find(r => r.user_id !== userId);
      setMinhaResposta(minha || null);
      setRespostaPartner(partner || null);
    }

    setLoading(false);
  };

  const responder = async () => {
    if (!texto.trim() || !pergunta) return;
    setSalvando(true);
    const { error } = await supabase.from('respostas').insert({
      pergunta_do_dia_id: pergunta.id,
      casal_id: casalId,
      user_id: userId,
      texto: texto.trim(),
    });
    if (!error) {
      setMinhaResposta({ id: 'novo', user_id: userId, texto: texto.trim() });
      setTexto('');
      // Recarregar para ver se o parceiro também respondeu
      setTimeout(carregarPergunta, 500);
    }
    setSalvando(false);
  };

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <p style={{ color: '#8A8578' }}>Carregando...</p>
    </div>
  );

  if (!pergunta) return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <Heart size={40} color="#D4AF37" style={{ marginBottom: 12 }} />
      <p style={{ color: '#8A8578' }}>Nenhuma pergunta disponível hoje.</p>
    </div>
  );

  const textoP = (pergunta.perguntas as any)?.texto || 'Pergunta do dia';

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#D4AF37', margin: '0 0 4px 0' }}>NÓS</h2>
        <p style={{ fontSize: 12, color: '#8A8578', margin: 0 }}>Pergunta do dia</p>
      </div>

      {/* Card da pergunta */}
      <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Heart size={16} color="#D4AF37" />
          <span style={{ fontSize: 11, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {(pergunta.perguntas as any)?.tema || 'Conexão'}
          </span>
        </div>
        <p style={{ fontSize: 18, color: '#F2EFE6', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          {textoP}
        </p>
      </div>

      {/* Minha resposta */}
      {!minhaResposta ? (
        <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#8A8578', margin: '0 0 12px 0' }}>Sua resposta</p>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="O que você pensa..."
            rows={3}
            style={{ width: '100%', padding: '12px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
          />
          <button onClick={responder} disabled={salvando || !texto.trim()} style={{ marginTop: 12, width: '100%', padding: '12px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Send size={16} /> {salvando ? 'Enviando...' : 'Responder'}
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#D4AF37', margin: '0 0 8px 0', fontWeight: 600 }}>Sua resposta</p>
          <p style={{ fontSize: 15, color: '#F2EFE6', margin: 0, lineHeight: 1.5 }}>{minhaResposta.texto}</p>
        </div>
      )}

      {/* Resposta do parceiro */}
      {minhaResposta && (
        respostaPartner ? (
          <div style={{ backgroundColor: '#111', border: '1px solid rgba(63,169,106,0.3)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 12, color: '#3FA96A', margin: '0 0 8px 0', fontWeight: 600 }}>Resposta do seu par</p>
            <p style={{ fontSize: 15, color: '#F2EFE6', margin: 0, lineHeight: 1.5 }}>{respostaPartner.texto}</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#111', border: '1px solid rgba(138,133,120,0.2)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <Lock size={24} color="#8A8578" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: '#8A8578', margin: 0 }}>Aguardando seu par responder...</p>
            <p style={{ fontSize: 12, color: '#8A8578', margin: '4px 0 0 0' }}>A resposta aparece quando os dois responderem</p>
          </div>
        )
      )}
    </div>
  );
}
