import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Plus, Home, CreditCard, FileText, Heart, LogOut } from 'lucide-react';

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

const NECESSIDADES_NOMES = ['Moradia', 'Contas da casa', 'Mercado', 'Saúde', 'Transporte'];
const DESEJOS_NOMES = ['Lazer a dois', 'Delivery', 'Assinaturas'];

export function Dashboard({ userId, onSignOut }: DashboardProps) {
  const [casalId, setCasalId] = useState<string | null>(null);
  const [casalNome, setCasalNome] = useState('Meu Cofre');
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [resumo, setResumo] = useState<Resumo>({ entrou: 0, saiu: 0, sobrou: 0, necessidades: 0, desejos: 0, liberdade: 0 });
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [userId]);

  const carregarDados = async () => {
    try {
      // Buscar casal do usuário
      const { data: membroData } = await supabase
        .from('membros')
        .select('casal_id, casais(nome)')
        .eq('user_id', userId)
        .single();

      if (!membroData) return;

      const cId = membroData.casal_id;
      setCasalId(cId);
      if (membroData.casais && (membroData.casais as any).nome) {
        setCasalNome((membroData.casais as any).nome);
      }

      // Buscar categorias
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nome')
        .or(`casal_id.is.null,casal_id.eq.${cId}`);

      const catMap: Record<string, string> = {};
      if (cats) cats.forEach(c => { catMap[c.id] = c.nome; });
      setCategorias(catMap);

      // Buscar lançamentos do mês atual
      const agora = new Date();
      const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
      const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('casal_id', cId)
        .gte('data', primeiroDia)
        .lte('data', ultimoDia)
        .order('data', { ascending: false })
        .limit(50);

      if (lancs) {
        setLancamentos(lancs);
        calcularResumo(lancs, catMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = (lancs: Lancamento[], catMap: Record<string, string>) => {
    let entrou = 0, saiu = 0, necessidades = 0, desejos = 0;

    lancs.forEach(l => {
      if (l.visibilidade === 'privado') return;
      if (l.tipo === 'receita') {
        entrou += l.valor;
      } else {
        saiu += l.valor;
        const catNome = l.categoria_id ? catMap[l.categoria_id] : '';
        if (NECESSIDADES_NOMES.includes(catNome)) {
          necessidades += l.valor;
        } else if (DESEJOS_NOMES.includes(catNome)) {
          desejos += l.valor;
        }
      }
    });

    const liberdade = Math.max(0, saiu - necessidades - desejos);
    setResumo({ entrou, saiu, sobrou: entrou - saiu, necessidades, desejos, liberdade });
  };

  const formatarValor = (v: number) => {
    if (!valoresVisiveis) return 'R$ ••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  // Anel SVG 50/30/20
  const DonutChart = () => {
    const cx = 80, cy = 80, r = 60, stroke = 18;
    const circ = 2 * Math.PI * r;
    const total = resumo.saiu || 1;
    const pNec = Math.min(resumo.necessidades / total, 1);
    const pDes = Math.min(resumo.desejos / total, 1);
    const pLib = Math.max(0, Math.min((total - resumo.necessidades - resumo.desejos) / total, 1));

    const arc1 = circ * pNec;
    const arc2 = circ * pDes;
    const arc3 = circ * pLib;
    const gap = 4;

    return (
      <div className="flex flex-col items-center gap-4 my-4">
        <div className="relative">
          <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke} />
            {/* Necessidades */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8C6D1F"
              strokeWidth={stroke} strokeDasharray={`${arc1 - gap} ${circ - arc1 + gap}`}
              strokeDashoffset={0} strokeLinecap="round" />
            {/* Desejos */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#D4AF37"
              strokeWidth={stroke} strokeDasharray={`${arc2 - gap} ${circ - arc2 + gap}`}
              strokeDashoffset={-(arc1)} strokeLinecap="round" />
            {/* Liberdade */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5D97A"
              strokeWidth={stroke} strokeDasharray={`${arc3 - gap} ${circ - arc3 + gap}`}
              strokeDashoffset={-(arc1 + arc2)} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'rotate(0deg)' }}>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#F5D97A', lineHeight: 1 }}>
              {valoresVisiveis
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(resumo.sobrou)
                : '••••'}
            </span>
            <span style={{ fontSize: 10, color: '#8A8578', marginTop: 2 }}>livre</span>
          </div>
        </div>

        {/* Legenda */}
        <div className="w-full flex flex-col gap-2 px-2">
          {[
            { label: 'Necessidades', valor: resumo.necessidades, cor: '#8C6D1F', meta: 0.5 },
            { label: 'Desejos', valor: resumo.desejos, cor: '#D4AF37', meta: 0.3 },
            { label: 'Liberdade', valor: resumo.liberdade, cor: '#F5D97A', meta: 0.2 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.cor }} />
                <span style={{ fontSize: 13, color: '#F2EFE6' }}>{item.label}</span>
                <span style={{ fontSize: 11, color: '#8A8578' }}>{Math.round(item.meta * 100)}%</span>
              </div>
              <span style={{ fontSize: 13, color: item.cor, fontVariantNumeric: 'tabular-nums' }}>
                {formatarValor(item.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ color: '#D4AF37', fontSize: 14 }}>Carregando cofre...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#050505', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <div>
          <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, background: 'linear-gradient(180deg, #F5D97A 0%, #D4AF37 45%, #8C6D1F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.01em', margin: 0 }}>
            COFRE A DOIS
          </h1>
          <p style={{ fontSize: 12, color: '#8A8578', margin: 0 }}>{casalNome}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => setValoresVisiveis(!valoresVisiveis)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', padding: 4 }}>
            {valoresVisiveis ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', padding: 4 }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '20px 16px' }}>

        {/* Cartões resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Entrou', valor: resumo.entrou, cor: '#3FA96A' },
            { label: 'Saiu', valor: resumo.saiu, cor: '#C2453D' },
            { label: 'Sobrou', valor: resumo.sobrou, cor: '#D4AF37' },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: '#111111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#8A8578', margin: '0 0 4px 0' }}>{item.label}</p>
              <p style={{ fontSize: 13, color: item.cor, fontVariantNumeric: 'tabular-nums', margin: 0, fontWeight: 600 }}>
                {valoresVisiveis
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.valor)
                  : '••••'}
              </p>
            </div>
          ))}
        </div>

        {/* Anel 50/30/20 */}
        <div style={{ backgroundColor: '#111111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: '16px 12px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#8A8578', margin: '0 0 4px 0' }}>Distribuição mensal</p>
          <p style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#D4AF37', margin: 0 }}>50 · 30 · 20</p>
          <DonutChart />
        </div>

        {/* Últimos lançamentos */}
        <div style={{ backgroundColor: '#111111', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 16, padding: '16px 12px' }}>
          <p style={{ fontSize: 13, color: '#8A8578', margin: '0 0 12px 0', fontWeight: 600 }}>Últimos lançamentos</p>
          {lancamentos.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8578', textAlign: 'center', padding: '20px 0' }}>
              Nenhum lançamento este mês
            </p>
          ) : (
            lancamentos.slice(0, 5).map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: 14, color: '#F2EFE6', margin: 0 }}>{l.descricao}</p>
                  <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0 0' }}>
                    {l.categoria_id ? categorias[l.categoria_id] : 'Sem categoria'} · {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: l.tipo === 'receita' ? '#3FA96A' : '#C2453D' }}>
                  {l.tipo === 'receita' ? '+' : '-'}{formatarValor(l.valor)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Botão flutuante */}
      <button
        onClick={() => alert('Lançar gasto — em breve!')}
        style={{ position: 'fixed', bottom: 88, right: 20, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(180deg, #F5D97A 0%, #D4AF37 45%, #8C6D1F 100%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(212,175,55,0.4)' }}
      >
        <Plus size={24} color="#050505" />
      </button>

      {/* Navbar inferior */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0a', borderTop: '1px solid rgba(212,175,55,0.15)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 16px' }}>
        {[
          { id: 'inicio', icon: Home, label: 'Início' },
          { id: 'lancar', icon: CreditCard, label: 'Lançar' },
          { id: 'contas', icon: FileText, label: 'Contas' },
          { id: 'nos', icon: Heart, label: 'Nós' },
        ].map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 12px', color: abaAtiva === aba.id ? '#D4AF37' : '#8A8578' }}
          >
            <aba.icon size={20} />
            <span style={{ fontSize: 10 }}>{aba.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
