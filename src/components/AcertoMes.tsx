import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';

interface AcertoMesProps {
  userId: string;
  casalId: string;
}

interface Membro {
  user_id: string;
  apelido: string | null;
  cor: string | null;
}

interface ItemAcerto {
  descricao: string;
  valor: number;
  pago_por: string;
  divisao: string;
  percentual: number | null;
  tipo: string;
}

export function AcertoMes({ userId, casalId }: AcertoMesProps) {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [itens, setItens] = useState<ItemAcerto[]>([]);
  const [deveQuem, setDeveQuem] = useState<{ devedor: string; credor: string; valor: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acertado, setAcertado] = useState(false);
  const [mesAtual] = useState(new Date());

  useEffect(() => { carregar(); }, [casalId]);

  const carregar = async () => {
    setLoading(true);

    // Buscar membros
    const { data: mems } = await supabase
      .from('membros').select('user_id, apelido, cor')
      .eq('casal_id', casalId);

    if (!mems || mems.length < 2) { setLoading(false); return; }
    setMembros(mems);

    // Buscar lançamentos compartilhados do mês
    const p1 = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString().split('T')[0];
    const p2 = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: lancs } = await supabase
      .from('lancamentos').select('*')
      .eq('casal_id', casalId)
      .eq('visibilidade', 'compartilhado')
      .eq('tipo', 'despesa')
      .gte('data', p1).lte('data', p2);

    if (!lancs) { setLoading(false); return; }
    setItens(lancs);
    calcularAcerto(lancs, mems);
    setLoading(false);
  };

  const calcularAcerto = (lancs: ItemAcerto[], mems: Membro[]) => {
    if (mems.length < 2) return;

    const [m1, m2] = mems;
    let saldo_m1 = 0; // positivo = m1 pagou mais do que devia
    let saldo_m2 = 0;

    lancs.forEach(l => {
      const v = l.valor;

      if (l.divisao === 'igual') {
        const cota = v / 2;
        if (l.pago_por === m1.user_id) {
          saldo_m1 += cota;   // m2 deve pagar a cota para m1
          saldo_m2 -= cota;
        } else {
          saldo_m2 += cota;
          saldo_m1 -= cota;
        }
      } else if (l.divisao === 'percentual' && l.percentual !== null) {
        const pct_m1 = l.percentual / 100;
        const pct_m2 = 1 - pct_m1;
        if (l.pago_por === m1.user_id) {
          saldo_m1 += v * pct_m2;
          saldo_m2 -= v * pct_m2;
        } else {
          saldo_m2 += v * pct_m1;
          saldo_m1 -= v * pct_m1;
        }
      }
    });

    const diff = saldo_m1 - saldo_m2;
    if (Math.abs(diff) < 0.01) {
      setDeveQuem(null); // Quits
    } else if (diff > 0) {
      setDeveQuem({ devedor: m2.user_id, credor: m1.user_id, valor: diff / 2 });
    } else {
      setDeveQuem({ devedor: m1.user_id, credor: m2.user_id, valor: Math.abs(diff) / 2 });
    }
  };

  const getNome = (uid: string) => {
    const m = membros.find(m => m.user_id === uid);
    if (!m) return 'Desconhecido';
    if (uid === userId) return 'Você';
    return m.apelido || 'Parceiro(a)';
  };

  const getCor = (uid: string) => {
    return membros.find(m => m.user_id === uid)?.cor || '#D4AF37';
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const totalCompartilhado = itens.filter(i => i.divisao === 'igual' || i.divisao === 'percentual').reduce((s, i) => s + i.valor, 0);

  const gastosPorPessoa = membros.map(m => ({
    ...m,
    total: itens.filter(i => i.pago_por === m.user_id).reduce((s, i) => s + i.valor, 0),
  }));

  return (
    <div style={{ padding: '16px', paddingBottom: 100 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#D4AF37', margin: '0 0 4px' }}>ACERTO DO MÊS</h2>
        <p style={{ fontSize: 12, color: '#8A8578', margin: 0, textTransform: 'capitalize' }}>{nomeMes}</p>
      </div>

      {loading ? (
        <p style={{ color: '#8A8578', textAlign: 'center', padding: 40 }}>Calculando...</p>
      ) : membros.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: '#8A8578' }}>Aguardando o parceiro entrar no cofre.</p>
        </div>
      ) : (
        <>
          {/* O veredito */}
          <div style={{ backgroundColor: '#111', border: `1px solid ${deveQuem ? 'rgba(212,175,55,0.35)' : 'rgba(63,169,106,0.35)'}`, borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            {acertado ? (
              <>
                <CheckCircle size={40} color="#3FA96A" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 18, color: '#3FA96A', fontWeight: 700, margin: '0 0 4px' }}>Acerto registrado!</p>
                <p style={{ fontSize: 13, color: '#8A8578', margin: 0 }}>Vocês estão quites este mês.</p>
                <button onClick={() => setAcertado(false)} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#8A8578', cursor: 'pointer', fontSize: 12, margin: '16px auto 0' }}>
                  <RefreshCw size={12} /> Recalcular
                </button>
              </>
            ) : deveQuem === null ? (
              <>
                <CheckCircle size={40} color="#3FA96A" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 20, color: '#3FA96A', fontWeight: 700, margin: 0 }}>Vocês estão quites!</p>
                <p style={{ fontSize: 13, color: '#8A8578', margin: '8px 0 0' }}>Nenhum acerto necessário este mês.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#8A8578', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Para acertar o mês</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: getCor(deveQuem.devedor), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 20 }}>
                      {getNome(deveQuem.devedor)[0]}
                    </div>
                    <p style={{ fontSize: 13, color: '#F2EFE6', margin: 0, fontWeight: 600 }}>{getNome(deveQuem.devedor)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <ArrowRight size={20} color="#D4AF37" />
                    <p style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#D4AF37', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(deveQuem.valor)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: getCor(deveQuem.credor), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 20 }}>
                      {getNome(deveQuem.credor)[0]}
                    </div>
                    <p style={{ fontSize: 13, color: '#F2EFE6', margin: 0, fontWeight: 600 }}>{getNome(deveQuem.credor)}</p>
                  </div>
                </div>
                <button onClick={() => setAcertado(true)} style={{ padding: '12px 28px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Marcar como acertado
                </button>
              </>
            )}
          </div>

          {/* Quem pagou o quê */}
          <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#8A8578', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quem pagou</p>
            {gastosPorPessoa.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: m.cor || '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {getNome(m.user_id)[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#F2EFE6', fontWeight: 500 }}>{getNome(m.user_id)}</span>
                    <span style={{ fontSize: 13, color: '#D4AF37', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(m.total)}</span>
                  </div>
                  <div style={{ backgroundColor: '#1a1a1a', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, backgroundColor: m.cor || '#D4AF37', width: totalCompartilhado > 0 ? `${(m.total / totalCompartilhado) * 100}%` : '0%', transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lista dos gastos compartilhados */}
          <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: '#8A8578', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gastos compartilhados</p>
              <p style={{ fontSize: 12, color: '#D4AF37', margin: 0, fontWeight: 600 }}>{fmt(totalCompartilhado)}</p>
            </div>
            {itens.length === 0 ? (
              <p style={{ fontSize: 13, color: '#8A8578', textAlign: 'center', padding: '16px 0' }}>Nenhum gasto compartilhado este mês</p>
            ) : itens.map(item => (
              <div key={`${item.descricao}-${item.valor}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p style={{ fontSize: 13, color: '#F2EFE6', margin: 0 }}>{item.descricao}</p>
                  <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0' }}>
                    Pago por {getNome(item.pago_por)} · {item.divisao === 'igual' ? '50/50' : `${item.percentual}%`}
                  </p>
                </div>
                <span style={{ fontSize: 13, color: '#C2453D', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.valor)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
