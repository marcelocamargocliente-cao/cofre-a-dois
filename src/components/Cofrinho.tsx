import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Target, TrendingUp, Trash2 } from 'lucide-react';

interface CofrinhoProps {
  userId: string;
  casalId: string;
}

interface Meta {
  id: string;
  nome: string;
  meta_valor: number;
  prazo: string | null;
  icone: string | null;
  arquivado: boolean;
  total_aportado: number;
}

const ICONES = ['🏠', '✈️', '🚗', '💍', '🎓', '👶', '🏖️', '💻', '🛋️', '🎯', '🌍', '💰'];

export function Cofrinho({ userId, casalId }: CofrinhoProps) {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNova, setModalNova] = useState(false);
  const [modalAporte, setModalAporte] = useState<Meta | null>(null);
  const [nome, setNome] = useState('');
  const [metaValor, setMetaValor] = useState('');
  const [prazo, setPrazo] = useState('');
  const [icone, setIcone] = useState('🎯');
  const [valorAporte, setValorAporte] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, [casalId]);

  useEffect(() => {
    if (!casalId) return;
    const channel = supabase.channel(`cofrinhos-${casalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofrinhos', filter: `casal_id=eq.${casalId}` }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cofrinho_aportes', filter: `casal_id=eq.${casalId}` }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casalId]);

  const carregar = async () => {
    const { data: cofrinhos } = await supabase
      .from('cofrinhos').select('*')
      .eq('casal_id', casalId)
      .eq('arquivado', false)
      .order('criado_em', { ascending: true });

    if (!cofrinhos) { setLoading(false); return; }

    const metasComTotal = await Promise.all(
      cofrinhos.map(async (c) => {
        const { data: aportes } = await supabase
          .from('cofrinho_aportes').select('valor')
          .eq('cofrinho_id', c.id);
        const total = aportes?.reduce((s, a) => s + a.valor, 0) || 0;
        return { ...c, total_aportado: total };
      })
    );

    setMetas(metasComTotal);
    setLoading(false);
  };

  const criarMeta = async () => {
    if (!nome.trim() || !metaValor) { setErro('Preencha nome e valor da meta.'); return; }
    setSalvando(true);
    setErro('');
    const { error } = await supabase.from('cofrinhos').insert({
      casal_id: casalId,
      nome: nome.trim(),
      meta_valor: parseInt(metaValor.replace(/\D/g, '')) / 100,
      prazo: prazo || null,
      icone,
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    setNome(''); setMetaValor(''); setPrazo(''); setIcone('🎯');
    setModalNova(false);
    carregar();
    setSalvando(false);
  };

  const fazerAporte = async () => {
    if (!modalAporte || !valorAporte) return;
    setSalvando(true);
    const valor = parseInt(valorAporte.replace(/\D/g, '')) / 100;
    await supabase.from('cofrinho_aportes').insert({
      cofrinho_id: modalAporte.id,
      casal_id: casalId,
      valor,
      data: new Date().toISOString().split('T')[0],
      feito_por: userId,
    });
    setValorAporte('');
    setModalAporte(null);
    carregar();
    setSalvando(false);
  };

  const arquivar = async (id: string) => {
    await supabase.from('cofrinhos').update({ arquivado: true }).eq('id', id);
    setMetas(prev => prev.filter(m => m.id !== id));
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtInput = (raw: string) => {
    const num = raw.replace(/\D/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(num) / 100);
  };

  const diasRestantes = (prazo: string | null) => {
    if (!prazo) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const p = new Date(prazo + 'T12:00:00'); p.setHours(0,0,0,0);
    return Math.round((p.getTime() - hoje.getTime()) / 86400000);
  };

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#D4AF37', margin: 0 }}>COFRINHOS</h2>
        <button onClick={() => setModalNova(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '8px 14px', color: '#D4AF37', cursor: 'pointer', fontSize: 13 }}>
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#8A8578', textAlign: 'center', padding: 40 }}>Carregando...</p>
      ) : metas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Target size={48} color="rgba(212,175,55,0.3)" style={{ marginBottom: 16 }} />
          <p style={{ color: '#8A8578', fontSize: 14 }}>Nenhuma meta ainda</p>
          <p style={{ color: '#4a4640', fontSize: 13 }}>Crie seu primeiro cofrinho</p>
        </div>
      ) : (
        metas.map(meta => {
          const pct = Math.min((meta.total_aportado / meta.meta_valor) * 100, 100);
          const atingida = pct >= 100;
          const dias = diasRestantes(meta.prazo);
          return (
            <div key={meta.id} style={{ backgroundColor: '#111', border: `1px solid ${atingida ? 'rgba(63,169,106,0.4)' : 'rgba(212,175,55,0.2)'}`, borderRadius: 16, padding: 18, marginBottom: 14, position: 'relative' }}>
              {/* Botão arquivar */}
              <button onClick={() => arquivar(meta.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#4a4640', padding: 4 }}>
                <Trash2 size={14} />
              </button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 32 }}>{meta.icone || '🎯'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, color: '#F2EFE6', margin: 0, fontWeight: 600 }}>{meta.nome}</p>
                  {dias !== null && (
                    <p style={{ fontSize: 11, color: dias < 0 ? '#C2453D' : dias <= 30 ? '#D4AF37' : '#8A8578', margin: '2px 0 0' }}>
                      {dias < 0 ? `Prazo encerrado há ${Math.abs(dias)} dias` : dias === 0 ? 'Prazo hoje!' : `${dias} dias restantes`}
                    </p>
                  )}
                </div>
                {atingida && (
                  <span style={{ backgroundColor: 'rgba(63,169,106,0.15)', color: '#3FA96A', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(63,169,106,0.3)' }}>
                    ✓ META ATINGIDA
                  </span>
                )}
              </div>

              {/* Valores */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 2px' }}>Guardado</p>
                  <p style={{ fontSize: 18, color: atingida ? '#3FA96A' : '#D4AF37', margin: 0, fontFamily: 'Anton, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(meta.total_aportado)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 2px' }}>Meta</p>
                  <p style={{ fontSize: 18, color: '#F2EFE6', margin: 0, fontFamily: 'Anton, sans-serif' }}>
                    {fmt(meta.meta_valor)}
                  </p>
                </div>
              </div>

              {/* Barra de progresso */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 8, height: 8, marginBottom: 14, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 8,
                  width: `${pct}%`,
                  background: atingida
                    ? '#3FA96A'
                    : 'linear-gradient(90deg, #8C6D1F 0%, #D4AF37 50%, #F5D97A 100%)',
                  transition: 'width 0.6s ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: '#8A8578', margin: 0 }}>
                  {pct.toFixed(0)}% concluído
                  {!atingida && ` · faltam ${fmt(meta.meta_valor - meta.total_aportado)}`}
                </p>
                {!atingida && (
                  <button onClick={() => setModalAporte(meta)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 100%)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#050505', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    <TrendingUp size={14} /> Guardar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Modal nova meta */}
      {modalNova && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setModalNova(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Nova meta</h2>
              <button onClick={() => setModalNova(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}><X size={22} /></button>
            </div>

            {/* Escolher ícone */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ícone</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setIcone(ic)} style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${icone === ic ? '#D4AF37' : 'rgba(212,175,55,0.15)'}`, backgroundColor: icone === ic ? 'rgba(212,175,55,0.1)' : '#111', cursor: 'pointer', fontSize: 22 }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome da meta</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Viagem para Europa"
                  style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor da meta</label>
                <input type="tel" inputMode="numeric" value={fmtInput(metaValor)} onChange={e => setMetaValor(e.target.value.replace(/\D/g, ''))} placeholder="R$ 0,00"
                  style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#D4AF37', fontSize: 20, fontFamily: 'Anton, sans-serif', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo (opcional)</label>
                <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
              </div>
            </div>

            {erro && <p style={{ color: '#C2453D', fontSize: 13, margin: '12px 0 0' }}>{erro}</p>}

            <button onClick={criarMeta} disabled={salvando} style={{ width: '100%', marginTop: 20, padding: '15px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {salvando ? 'Criando...' : 'Criar cofrinho'}
            </button>
          </div>
        </div>
      )}

      {/* Modal aporte */}
      {modalAporte && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setModalAporte(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>
                {modalAporte.icone} Guardar no {modalAporte.nome}
              </h2>
              <button onClick={() => setModalAporte(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}><X size={22} /></button>
            </div>

            <div style={{ backgroundColor: '#111', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 2px' }}>Guardado</p>
                <p style={{ fontSize: 16, color: '#D4AF37', margin: 0, fontFamily: 'Anton, sans-serif' }}>{fmt(modalAporte.total_aportado)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 2px' }}>Falta</p>
                <p style={{ fontSize: 16, color: '#F2EFE6', margin: 0, fontFamily: 'Anton, sans-serif' }}>{fmt(modalAporte.meta_valor - modalAporte.total_aportado)}</p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quanto guardar agora?</label>
              <input type="tel" inputMode="numeric" value={fmtInput(valorAporte)} onChange={e => setValorAporte(e.target.value.replace(/\D/g, ''))} placeholder="R$ 0,00" autoFocus
                style={{ width: '100%', padding: '16px 14px', backgroundColor: '#1a1a1a', border: '2px solid #D4AF37', borderRadius: 12, color: '#D4AF37', fontSize: 28, fontFamily: 'Anton, sans-serif', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <button onClick={fazerAporte} disabled={salvando || !valorAporte} style={{ width: '100%', padding: '15px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {salvando ? 'Guardando...' : 'Guardar agora'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
