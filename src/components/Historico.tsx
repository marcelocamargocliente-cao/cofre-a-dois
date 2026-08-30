import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';
import { EditarLancamento } from './EditarLancamento';

interface HistoricoProps {
  userId: string;
  casalId: string;
}

interface Evento {
  id: string;
  tipo: 'lancamento' | 'conta_paga';
  descricao: string;
  valor: number;
  data: string;
  subtipo?: string;
  categoria?: string;
  visibilidade?: string;
  pago_por?: string;
}

export function Historico({ userId, casalId }: HistoricoProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [filtro, setFiltro] = useState<'todos' | 'despesa' | 'receita' | 'contas'>('todos');
  const [editando, setEditando] = useState<Evento | null>(null);

  useEffect(() => { carregar(); }, [casalId, mesAtual]);

  const carregar = async () => {
    setLoading(true);
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const p1 = new Date(ano, mes, 1).toISOString().split('T')[0];
    const p2 = new Date(ano, mes + 1, 0).toISOString().split('T')[0];

    // Buscar categorias
    const { data: cats } = await supabase
      .from('categorias').select('id, nome')
      .or(`casal_id.is.null,casal_id.eq.${casalId}`);
    const catMap: Record<string, string> = {};
    if (cats) cats.forEach(c => { catMap[c.id] = c.nome; });
    setCategorias(catMap);

    // Buscar lançamentos do mês
    const { data: lancs } = await supabase
      .from('lancamentos').select('*')
      .eq('casal_id', casalId)
      .gte('data', p1).lte('data', p2)
      .order('data', { ascending: false });

    // Buscar contas pagas no mês
    const { data: contasPagas } = await supabase
      .from('contas_a_pagar').select('*')
      .eq('casal_id', casalId)
      .eq('pago', true)
      .gte('pago_em', new Date(ano, mes, 1).toISOString())
      .lte('pago_em', new Date(ano, mes + 1, 0, 23, 59, 59).toISOString())
      .order('pago_em', { ascending: false });

    const lista: Evento[] = [];

    if (lancs) {
      lancs.forEach(l => {
        lista.push({
          id: l.id,
          tipo: 'lancamento',
          descricao: l.descricao,
          valor: l.valor,
          data: l.data,
          subtipo: l.tipo,
          categoria: l.categoria_id ? catMap[l.categoria_id] : '',
          visibilidade: l.visibilidade,
          pago_por: l.pago_por,
        });
      });
    }

    if (contasPagas) {
      contasPagas.forEach(c => {
        lista.push({
          id: `conta-${c.id}`,
          tipo: 'conta_paga',
          descricao: c.descricao,
          valor: c.valor,
          data: c.pago_em?.split('T')[0] || c.vencimento,
        });
      });
    }

    // Ordenar por data decrescente
    lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    setEventos(lista);
    setLoading(false);
  };

  // Realtime
  useEffect(() => {
    if (!casalId) return;
    const channel = supabase
      .channel(`historico-${casalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos', filter: `casal_id=eq.${casalId}` }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_a_pagar', filter: `casal_id=eq.${casalId}` }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casalId]);

  const mudarMes = (delta: number) => {
    setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const eventosFiltrados = eventos.filter(e => {
    if (filtro === 'todos') return true;
    if (filtro === 'despesa') return e.tipo === 'lancamento' && e.subtipo === 'despesa';
    if (filtro === 'receita') return e.tipo === 'lancamento' && e.subtipo === 'receita';
    if (filtro === 'contas') return e.tipo === 'conta_paga';
    return true;
  });

  // Totais
  const totalEntrou = eventos.filter(e => e.subtipo === 'receita').reduce((s, e) => s + e.valor, 0);
  const totalSaiu = eventos.filter(e => e.subtipo === 'despesa').reduce((s, e) => s + e.valor, 0);
  const totalContas = eventos.filter(e => e.tipo === 'conta_paga').reduce((s, e) => s + e.valor, 0);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Agrupar por data
  const grupos: Record<string, Evento[]> = {};
  eventosFiltrados.forEach(e => {
    const d = e.data;
    if (!grupos[d]) grupos[d] = [];
    grupos[d].push(e);
  });

  const formatarData = (data: string) => {
    const d = new Date(data + 'T12:00:00');
    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <button onClick={() => mudarMes(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', padding: 8 }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#D4AF37', textTransform: 'capitalize' }}>{nomeMes}</span>
        <button onClick={() => mudarMes(1)} disabled={mesAtual.getMonth() === new Date().getMonth() && mesAtual.getFullYear() === new Date().getFullYear()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', padding: 8, opacity: mesAtual.getMonth() === new Date().getMonth() ? 0.3 : 1 }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Resumo do mês */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 16px' }}>
        {[
          { label: 'Entrou', valor: totalEntrou, cor: '#3FA96A' },
          { label: 'Saiu', valor: totalSaiu + totalContas, cor: '#C2453D' },
          { label: 'Sobrou', valor: totalEntrou - totalSaiu - totalContas, cor: '#D4AF37' },
        ].map(i => (
          <div key={i.label} style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#8A8578', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i.label}</p>
            <p style={{ fontSize: 12, color: i.cor, margin: 0, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(i.valor)}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', overflowX: 'auto' }}>
        {[
          { id: 'todos', label: 'Tudo' },
          { id: 'despesa', label: 'Despesas' },
          { id: 'receita', label: 'Receitas' },
          { id: 'contas', label: 'Contas pagas' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id as any)} style={{
            padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
            backgroundColor: filtro === f.id ? '#D4AF37' : '#111',
            color: filtro === f.id ? '#050505' : '#8A8578',
            fontWeight: filtro === f.id ? 700 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Lista agrupada por data */}
      <div style={{ padding: '8px 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#8A8578', padding: '40px 0' }}>Carregando...</p>
        ) : eventosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8A8578', padding: '40px 0' }}>Nenhum registro neste período</p>
        ) : (
          Object.entries(grupos).map(([data, items]) => (
            <div key={data} style={{ marginBottom: 20 }}>
              {/* Cabeçalho da data */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#8A8578', textTransform: 'capitalize', fontWeight: 600 }}>
                  {formatarData(data)}
                </span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.1)' }} />
              </div>

              {/* Itens do dia */}
              {items.map(evento => (
                <div key={evento.id} onClick={() => evento.tipo === 'lancamento' ? setEditando(evento) : null} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 12, marginBottom: 8, cursor: evento.tipo === 'lancamento' ? 'pointer' : 'default', transition: 'border-color 0.2s' }}>
                  {/* Ícone */}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    backgroundColor: evento.tipo === 'conta_paga' ? 'rgba(63,169,106,0.15)' :
                      evento.subtipo === 'receita' ? 'rgba(63,169,106,0.15)' : 'rgba(194,69,61,0.15)'
                  }}>
                    {evento.tipo === 'conta_paga'
                      ? <CheckCircle size={18} color="#3FA96A" />
                      : evento.subtipo === 'receita'
                        ? <TrendingUp size={18} color="#3FA96A" />
                        : <TrendingDown size={18} color="#C2453D" />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: '#F2EFE6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evento.descricao}
                      {evento.visibilidade === 'privado' && <span style={{ color: '#D4AF37', marginLeft: 6, fontSize: 12 }}>🔒</span>}
                    </p>
                    <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0' }}>
                      {evento.tipo === 'conta_paga' ? '✓ Conta paga' : evento.categoria || 'Sem categoria'}
                    </p>
                  </div>

                  {/* Valor */}
                  <span style={{
                    fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    color: evento.tipo === 'conta_paga' ? '#3FA96A' :
                      evento.subtipo === 'receita' ? '#3FA96A' : '#C2453D'
                  }}>
                    {evento.subtipo === 'receita' ? '+' : '-'}{fmt(evento.valor)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      {editando && editando.tipo === 'lancamento' && (
        <EditarLancamento
          lancamento={{
            id: editando.id,
            descricao: editando.descricao,
            valor: editando.valor,
            tipo: editando.subtipo as 'despesa' | 'receita',
            data: editando.data,
            categoria_id: null,
            visibilidade: editando.visibilidade || 'compartilhado',
          }}
          casalId={casalId}
          onClose={() => setEditando(null)}
          onSalvo={() => { carregar(); setEditando(null); }}
        />
      )}
    </div>
  );
}
