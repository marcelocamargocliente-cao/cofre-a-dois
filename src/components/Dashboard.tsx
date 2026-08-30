import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LancarGasto } from './LancarGasto';
import { Convite } from './Convite';
import { ContasPagar } from './ContasPagar';
import { Nos } from './Nos';
import { Eye, EyeOff, Plus, Home, CreditCard, FileText, Heart, LogOut, UserPlus } from 'lucide-react';

interface DashboardProps {
  userId: string;
  onSignOut: () => void;
}

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data: string;
  categoria_id: string | null;
  visibilidade: string;
}

interface Resumo {
  entrou: number;
  saiu: number;
  sobrou: number;
  necessidades: number;
  desejos: number;
  liberdade: number;
}

const NECESSIDADES = ['Moradia', 'Contas da casa', 'Mercado', 'Saúde', 'Transporte'];
const DESEJOS = ['Lazer a dois', 'Delivery', 'Assinaturas'];

export function Dashboard({ userId, onSignOut }: DashboardProps) {
  const [casalId, setCasalId] = useState<string | null>(null);
  const [casalNome, setCasalNome] = useState('Meu Cofre');
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [resumo, setResumo] = useState<Resumo>({ entrou: 0, saiu: 0, sobrou: 0, necessidades: 0, desejos: 0, liberdade: 0 });
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const [aba, setAba] = useState('inicio');
  const [modalLancar, setModalLancar] = useState(false);
  const [modalConvite, setModalConvite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarDados(); }, [userId]);

  const carregarDados = async () => {
    try {
      const { data: m } = await supabase.from('membros')
        .select('casal_id, casais(nome)').eq('user_id', userId).single();
      if (!m) return;
      const cId = m.casal_id;
      setCasalId(cId);
      if ((m.casais as any)?.nome) setCasalNome((m.casais as any).nome);

      const { data: cats } = await supabase.from('categorias').select('id, nome')
        .or(`casal_id.is.null,casal_id.eq.${cId}`);
      const catMap: Record<string, string> = {};
      if (cats) cats.forEach(c => { catMap[c.id] = c.nome; });
      setCategorias(catMap);

      const agora = new Date();
      const p1 = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
      const p2 = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: lancs } = await supabase.from('lancamentos').select('*')
        .eq('casal_id', cId).gte('data', p1).lte('data', p2)
        .order('data', { ascending: false }).limit(50);

      if (lancs) { setLancamentos(lancs); calcResumo(lancs, catMap); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const calcResumo = (lancs: Lancamento[], catMap: Record<string, string>) => {
    let entrou = 0, saiu = 0, nec = 0, des = 0;
    lancs.forEach(l => {
      if (l.visibilidade === 'privado') return;
      if (l.tipo === 'receita') entrou += l.valor;
      else {
        saiu += l.valor;
        const nome = l.categoria_id ? catMap[l.categoria_id] : '';
        if (NECESSIDADES.includes(nome)) nec += l.valor;
        else if (DESEJOS.includes(nome)) des += l.valor;
      }
    });
    setResumo({ entrou, saiu, sobrou: entrou - saiu, necessidades: nec, desejos: des, liberdade: Math.max(0, saiu - nec - des) });
  };

  const fmt = (v: number) => {
    if (!valoresVisiveis) return '••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  };

  const DonutChart = () => {
    const r = 60, stroke = 18, circ = 2 * Math.PI * r;
    const total = resumo.saiu || 1;
    const pN = Math.min(resumo.necessidades / total, 1);
    const pD = Math.min(resumo.desejos / total, 1 - pN);
    const pL = Math.max(0, 1 - pN - pD);
    const g = 3;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '8px 0' }}>
        <div style={{ position: 'relative' }}>
          <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={80} cy={80} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke} />
            <circle cx={80} cy={80} r={r} fill="none" stroke="#8C6D1F" strokeWidth={stroke} strokeDasharray={`${circ*pN-g} ${circ-circ*pN+g}`} strokeDashoffset={0} strokeLinecap="round" />
            <circle cx={80} cy={80} r={r} fill="none" stroke="#D4AF37" strokeWidth={stroke} strokeDasharray={`${circ*pD-g} ${circ-circ*pD+g}`} strokeDashoffset={-(circ*pN)} strokeLinecap="round" />
            <circle cx={80} cy={80} r={r} fill="none" stroke="#F5D97A" strokeWidth={stroke} strokeDasharray={`${circ*pL-g} ${circ-circ*pL+g}`} strokeDashoffset={-(circ*(pN+pD))} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#F5D97A', lineHeight: 1 }}>{fmt(resumo.sobrou)}</span>
            <span style={{ fontSize: 10, color: '#8A8578', marginTop: 2 }}>livre</span>
          </div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Necessidades', valor: resumo.necessidades, cor: '#8C6D1F', meta: '50%' },
            { label: 'Desejos', valor: resumo.desejos, cor: '#D4AF37', meta: '30%' },
            { label: 'Liberdade', valor: resumo.liberdade, cor: '#F5D97A', meta: '20%' },
          ].map(i => (
            <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: i.cor }} />
                <span style={{ fontSize: 13, color: '#F2EFE6' }}>{i.label}</span>
                <span style={{ fontSize: 11, color: '#8A8578' }}>{i.meta}</span>
              </div>
              <span style={{ fontSize: 13, color: i.cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(i.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#D4AF37' }}>Carregando...</span></div>;

  const Header = () => (
    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.15)', position: 'sticky', top: 0, backgroundColor: '#050505', zIndex: 10 }}>
      <div>
        <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>COFRE A DOIS</h1>
        <p style={{ fontSize: 11, color: '#8A8578', margin: 0 }}>{casalNome}</p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setModalConvite(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <UserPlus size={18} />
          </button>
        {aba === 'inicio' && (
          <button onClick={() => setValoresVisiveis(!valoresVisiveis)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            {valoresVisiveis ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); onSignOut(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );

  const Navbar = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0a', borderTop: '1px solid rgba(212,175,55,0.15)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 20px', zIndex: 20 }}>
      {[
        { id: 'inicio', icon: Home, label: 'Início' },
        { id: 'lancar', icon: CreditCard, label: 'Lançar', action: () => setModalLancar(true) },
        { id: 'contas', icon: FileText, label: 'Contas' },
        { id: 'nos', icon: Heart, label: 'Nós' },
      ].map(a => (
        <button key={a.id} onClick={() => { setAba(a.id); a.action?.(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 16px', color: aba === a.id ? '#D4AF37' : '#8A8578' }}>
          <a.icon size={20} />
          <span style={{ fontSize: 10 }}>{a.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505' }}>
      <Header />

      {/* INÍCIO */}
      {aba === 'inicio' && (
        <div style={{ padding: '16px', paddingBottom: 100 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[{ label: 'Entrou', valor: resumo.entrou, cor: '#3FA96A' }, { label: 'Saiu', valor: resumo.saiu, cor: '#C2453D' }, { label: 'Sobrou', valor: resumo.sobrou, cor: '#D4AF37' }].map(i => (
              <div key={i.label} style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 4px 0' }}>{i.label}</p>
                <p style={{ fontSize: 12, color: i.cor, fontVariantNumeric: 'tabular-nums', margin: 0, fontWeight: 600 }}>{fmt(i.valor)}</p>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: '14px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 2px' }}>Distribuição mensal</p>
            <p style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: '#D4AF37', margin: 0 }}>50 · 30 · 20</p>
            <DonutChart />
          </div>

          <div style={{ backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: '14px 12px' }}>
            <p style={{ fontSize: 13, color: '#8A8578', margin: '0 0 12px', fontWeight: 600 }}>Histórico do mês</p>
            {lancamentos.length === 0
              ? <p style={{ fontSize: 13, color: '#8A8578', textAlign: 'center', padding: '16px 0' }}>Nenhum lançamento ainda</p>
              : lancamentos.slice(0, 5).map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', paddingRight: 60, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <p style={{ fontSize: 14, color: '#F2EFE6', margin: 0 }}>{l.descricao}</p>
                    <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0' }}>
                      {l.categoria_id ? categorias[l.categoria_id] : 'Sem categoria'} · {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {l.visibilidade === 'privado' && <span style={{ color: '#D4AF37', marginLeft: 4 }}>🔒</span>}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: l.tipo === 'receita' ? '#3FA96A' : '#C2453D', fontVariantNumeric: 'tabular-nums' }}>
                    {l.tipo === 'receita' ? '+' : '-'}{fmt(l.valor)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* CONTAS */}
      {aba === 'contas' && casalId && <ContasPagar userId={userId} casalId={casalId} />}

      {/* NÓS */}
      {aba === 'nos' && casalId && <Nos userId={userId} casalId={casalId} />}

      {/* FAB */}
      {aba === 'inicio' && (
        <button onClick={() => setModalLancar(true)} style={{ position: 'fixed', bottom: 96, right: 16, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(212,175,55,0.4)', zIndex: 15 }}>
          <Plus size={24} color="#050505" />
        </button>
      )}

      <Navbar />

      {modalConvite && casalId && (
        <Convite userId={userId} casalId={casalId} onClose={() => setModalConvite(false)} />
      )}

      {modalLancar && casalId && (
        <LancarGasto userId={userId} casalId={casalId}
          onClose={() => setModalLancar(false)}
          onSalvo={() => { carregarDados(); setModalLancar(false); }} />
      )}
    </div>
  );
}
