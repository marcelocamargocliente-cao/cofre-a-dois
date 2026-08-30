import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2, ChevronDown } from 'lucide-react';

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data: string;
  categoria_id: string | null;
  visibilidade: string;
}

interface EditarLancamentoProps {
  lancamento: Lancamento;
  casalId: string;
  onClose: () => void;
  onSalvo: () => void;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

export function EditarLancamento({ lancamento, casalId, onClose, onSalvo }: EditarLancamentoProps) {
  const [descricao, setDescricao] = useState(lancamento.descricao);
  const [valorCentavos, setValorCentavos] = useState(String(Math.round(lancamento.valor * 100)));
  const [tipo, setTipo] = useState<'despesa' | 'receita'>(lancamento.tipo);
  const [visibilidade, setVisibilidade] = useState(lancamento.visibilidade);
  const [categoriaId, setCategoriaId] = useState(lancamento.categoria_id || '');
  const [data, setData] = useState(lancamento.data);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.from('categorias').select('id, nome, tipo')
      .or(`casal_id.is.null,casal_id.eq.${casalId}`)
      .eq('tipo', tipo)
      .then(({ data }) => { if (data) setCategorias(data); });
  }, [tipo, casalId]);

  const valorFormatado = () => {
    if (!valorCentavos) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(valorCentavos) / 100);
  };

  const salvar = async () => {
    if (!descricao.trim() || !valorCentavos || parseInt(valorCentavos) === 0) {
      setErro('Preencha descrição e valor.');
      return;
    }
    setSalvando(true);
    setErro('');
    const { error } = await supabase.from('lancamentos').update({
      descricao: descricao.trim(),
      valor: parseInt(valorCentavos) / 100,
      tipo,
      data,
      categoria_id: categoriaId || null,
      visibilidade,
    }).eq('id', lancamento.id);

    if (error) { setErro(error.message); setSalvando(false); return; }
    onSalvo();
    onClose();
  };

  const excluir = async () => {
    setExcluindo(true);
    await supabase.from('lancamentos').delete().eq('id', lancamento.id);
    onSalvo();
    onClose();
  };

  const corTipo = tipo === 'despesa' ? '#C2453D' : '#3FA96A';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
      <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Editar lançamento</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, backgroundColor: '#111', borderRadius: 12, padding: 4 }}>
          {(['despesa', 'receita'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              backgroundColor: tipo === t ? (t === 'despesa' ? '#C2453D' : '#3FA96A') : 'transparent',
              color: tipo === t ? '#fff' : '#8A8578',
            }}>
              {t === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: corTipo, fontWeight: 700 }}>R$</span>
            <input
              type="tel" inputMode="numeric"
              value={valorFormatado().replace('R$', '').trim()}
              onChange={e => setValorCentavos(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100%', padding: '16px 14px 16px 48px', backgroundColor: '#1a1a1a', border: `2px solid ${corTipo}`, borderRadius: 12, color: corTipo, fontSize: 26, fontFamily: 'Anton, sans-serif', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
          <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        {/* Data */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
        </div>

        {/* Categoria */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoria</label>
          <div style={{ position: 'relative' }}>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
              style={{ width: '100%', padding: '12px 40px 12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, appearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
              <option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A8578', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Visibilidade */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibilidade</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['compartilhado', 'privado'] as const).map(v => (
              <button key={v} onClick={() => setVisibilidade(v)} style={{
                flex: 1, padding: '10px', border: `1px solid ${visibilidade === v ? '#D4AF37' : 'rgba(212,175,55,0.2)'}`,
                borderRadius: 10, cursor: 'pointer', fontSize: 13,
                backgroundColor: visibilidade === v ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: visibilidade === v ? '#D4AF37' : '#8A8578',
              }}>
                {v === 'compartilhado' ? '👀 Compartilhado' : '🔒 Só eu vejo'}
              </button>
            ))}
          </div>
        </div>

        {erro && <p style={{ color: '#C2453D', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

        {/* Botões */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={salvar} disabled={salvando} style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)',
            border: 'none', borderRadius: 12, color: '#050505', fontSize: 16, fontWeight: 700, cursor: 'pointer'
          }}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>

          {confirmExcluir ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={excluir} disabled={excluindo} style={{ flex: 1, padding: '13px', backgroundColor: '#C2453D', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button onClick={() => setConfirmExcluir(false)} style={{ flex: 1, padding: '13px', backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#8A8578', fontSize: 15, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmExcluir(true)} style={{ width: '100%', padding: '13px', backgroundColor: 'transparent', border: '1px solid rgba(194,69,61,0.3)', borderRadius: 12, color: '#C2453D', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Trash2 size={16} /> Excluir lançamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
