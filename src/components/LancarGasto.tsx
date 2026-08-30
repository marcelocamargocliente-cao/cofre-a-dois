import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, ChevronDown } from 'lucide-react';

interface LancarGastoProps {
  userId: string;
  casalId: string;
  onClose: () => void;
  onSalvo: () => void;
}

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
}

export function LancarGasto({ userId, casalId, onClose, onSalvo }: LancarGastoProps) {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');
  const [visibilidade, setVisibilidade] = useState<'compartilhado' | 'privado'>('compartilhado');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase
      .from('categorias')
      .select('id, nome, tipo')
      .or(`casal_id.is.null,casal_id.eq.${casalId}`)
      .eq('tipo', tipo)
      .then(({ data }) => {
        if (data) setCategorias(data);
      });
  }, [tipo, casalId]);

  const handleValorInput = (v: string) => {
    const numerico = v.replace(/\D/g, '');
    setValor(numerico);
  };

  const valorFormatado = () => {
    if (!valor) return 'R$ 0,00';
    const num = parseInt(valor) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const handleSalvar = async () => {
    if (!valor || valor === '0') {
      setErro('Digite um valor.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Digite uma descrição.');
      return;
    }
    setLoading(true);
    setErro('');
    try {
      const { error } = await supabase.from('lancamentos').insert({
        casal_id: casalId,
        tipo,
        descricao: descricao.trim(),
        valor: parseInt(valor) / 100,
        data: new Date().toISOString().split('T')[0],
        categoria_id: categoriaId || null,
        visibilidade,
        pago_por: userId,
        criado_por: userId,
        divisao: 'igual',
      });
      if (error) throw error;
      onSalvo();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)' }} />

      {/* Sheet */}
      <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Lançar</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, backgroundColor: '#111', borderRadius: 12, padding: 4 }}>
          {(['despesa', 'receita'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              backgroundColor: tipo === t ? (t === 'despesa' ? '#C2453D' : '#3FA96A') : 'transparent',
              color: tipo === t ? '#fff' : '#8A8578',
              transition: 'all 0.2s'
            }}>
              {t === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        {/* Valor grande */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 42, fontFamily: 'Anton, sans-serif', color: tipo === 'despesa' ? '#C2453D' : '#3FA96A', letterSpacing: '-0.02em' }}>
            {valorFormatado()}
          </div>
          <input
            type="tel"
            value={valor}
            onChange={e => handleValorInput(e.target.value)}
            placeholder="Digite o valor"
            style={{ opacity: 0, position: 'absolute', width: 1, height: 1 }}
            autoFocus
          />
          <button
            onClick={() => (document.querySelector('input[type="tel"]') as HTMLElement)?.focus()}
            style={{ marginTop: 8, fontSize: 13, color: '#8A8578', background: 'none', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}
          >
            Tocar para digitar
          </button>
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: Mercado, Aluguel, Cinema..."
            style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>

        {/* Categoria */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Categoria</label>
          <div style={{ position: 'relative' }}>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', paddingRight: 40, backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: categoriaId ? '#F2EFE6' : '#8A8578', fontSize: 15, appearance: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="">Sem categoria</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A8578', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Visibilidade */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Visibilidade</label>
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

        {/* Botão salvar */}
        <button
          onClick={handleSalvar}
          disabled={loading}
          style={{ width: '100%', padding: '15px', background: loading ? '#333' : 'linear-gradient(180deg, #F5D97A 0%, #D4AF37 45%, #8C6D1F 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Salvando...' : 'Lançar gasto'}
        </button>
      </div>
    </div>
  );
}
