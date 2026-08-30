import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Check, X } from 'lucide-react';
import { EditarConta } from './EditarConta';
import { useRef, useCallback } from 'react';

function useConfete() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const disparar = useCallback((origemX: number, origemY: number) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // Cores do tema ouro + verde comemorativo
    const cores = ['#F5D97A', '#D4AF37', '#8C6D1F', '#3FA96A', '#ffffff', '#F2EFE6'];

    cv.width = window.innerWidth;
    cv.height = window.innerHeight;

    const papeis = Array.from({ length: 120 }, () => ({
      x: origemX,
      y: origemY,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      giro: Math.random() * 6,
      dGiro: (Math.random() - 0.5) * 0.35,
      cor: cores[Math.floor(Math.random() * cores.length)],
      l: 4 + Math.random() * 6,
      a: 7 + Math.random() * 8,
    }));

    let animId: number;

    const rodar = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let vivos = 0;

      papeis.forEach(p => {
        p.vy += 0.32;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.giro += p.dGiro;
        if (p.y < cv.height + 30) vivos++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.l / 2, -p.a / 2, p.l, p.a);
        ctx.restore();
      });

      if (vivos > 0) {
        animId = requestAnimationFrame(rodar);
      } else {
        ctx.clearRect(0, 0, cv.width, cv.height);
      }
    };

    rodar();
    return () => cancelAnimationFrame(animId);
  }, []);

  const Canvas = () => (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  );

  return { Canvas, disparar };
}

interface ContasPagarProps {
  userId: string;
  casalId: string;
}

interface Conta {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  responsavel_id: string | null;
  recorrencia: string;
}

export function ContasPagar({ userId, casalId }: ContasPagarProps) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const { Canvas: ConfeteCanvas, disparar: dispararConfete } = useConfete();
  const [modalNova, setModalNova] = useState(false);
  const [editandoConta, setEditandoConta] = useState<Conta | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valorCentavos, setValorCentavos] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [recorrencia, setRecorrencia] = useState('unica');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, [casalId]);

  // Realtime — contas atualizadas em tempo real
  useEffect(() => {
    if (!casalId) return;
    const channel = supabase
      .channel(`contas-${casalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contas_a_pagar',
        filter: `casal_id=eq.${casalId}`,
      }, () => { carregar(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casalId]);

  const carregar = async () => {
    const { data } = await supabase
      .from('contas_a_pagar').select('*')
      .eq('casal_id', casalId)
      .eq('pago', false)
      .order('vencimento', { ascending: true });
    if (data) setContas(data);
    setLoading(false);
  };

  const marcarPago = async (id: string, e: React.MouseEvent) => {
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    await supabase.from('contas_a_pagar')
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq('id', id);

    setContas(prev => prev.filter(c => c.id !== id));
    dispararConfete(cx, cy);
  };

  const salvarNova = async () => {
    if (!descricao.trim() || !valor || !vencimento) { setErro('Preencha todos os campos.'); return; }
    setSalvando(true);
    setErro('');
    const { error } = await supabase.from('contas_a_pagar').insert({
      casal_id: casalId,
      descricao: descricao.trim(),
      valor: parseInt(valorCentavos || '0') / 100,
      vencimento,
      recorrencia,
      responsavel_id: userId,
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    setDescricao(''); setValorCentavos(''); setVencimento(''); setRecorrencia('unica');
    setModalNova(false);
    carregar();
    setSalvando(false);
  };

  const diasRestantes = (venc: string) => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const v = new Date(venc + 'T12:00:00'); v.setHours(0,0,0,0);
    return Math.round((v.getTime() - hoje.getTime()) / 86400000);
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const grupos = {
    vencidas: contas.filter(c => diasRestantes(c.vencimento) < 0),
    semana: contas.filter(c => { const d = diasRestantes(c.vencimento); return d >= 0 && d <= 7; }),
    depois: contas.filter(c => diasRestantes(c.vencimento) > 7),
  };

  const GrupoLista = ({ titulo, items, cor }: { titulo: string; items: Conta[]; cor: string }) =>
    items.length === 0 ? null : (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: cor, fontWeight: 600, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</p>
        {items.map(c => {
          const dias = diasRestantes(c.vencimento);
          return (
            <div key={c.id} onClick={() => setEditandoConta(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', backgroundColor: '#111', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
              <button onClick={(e) => marcarPago(c.id, e)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${cor}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={14} color={cor} />
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: '#F2EFE6', margin: 0 }}>{c.descricao}</p>
                <p style={{ fontSize: 11, color: '#8A8578', margin: '2px 0 0 0' }}>
                  {dias < 0 ? `Venceu há ${Math.abs(dias)} dias` : dias === 0 ? 'Vence hoje' : `${dias} dias`}
                  {c.recorrencia !== 'unica' && <span style={{ marginLeft: 6, color: '#D4AF37' }}>↻</span>}
                </p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: cor, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.valor)}</span>
            </div>
          );
        })}
      </div>
    );

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100 }}>
      <ConfeteCanvas />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#D4AF37', margin: 0 }}>CONTAS</h2>
        <button onClick={() => setModalNova(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 10, padding: '8px 14px', color: '#D4AF37', cursor: 'pointer', fontSize: 13 }}>
          <Plus size={16} /> Nova
        </button>
      </div>

      {loading ? <p style={{ color: '#8A8578', textAlign: 'center' }}>Carregando...</p> : (
        contas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Check size={40} color="#3FA96A" style={{ marginBottom: 12 }} />
            <p style={{ color: '#8A8578', fontSize: 14 }}>Nenhuma conta em aberto</p>
          </div>
        ) : (
          <>
            <GrupoLista titulo="Vencidas" items={grupos.vencidas} cor="#C2453D" />
            <GrupoLista titulo="Esta semana" items={grupos.semana} cor="#D4AF37" />
            <GrupoLista titulo="Próximas" items={grupos.depois} cor="#8A8578" />
          </>
        )
      )}

      {modalNova && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div onClick={() => setModalNova(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)' }} />
          <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#F2EFE6', margin: 0 }}>Nova conta</h3>
              <button onClick={() => setModalNova(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578', padding: 4 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Descrição</label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel, Internet..." style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={valorCentavos ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(valorCentavos) / 100) : ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setValorCentavos(raw);
                  }}
                  placeholder="R$ 0,00"
                  style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 18, fontFamily: 'Anton, sans-serif', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Vencimento</label>
                <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6 }}>Recorrência</label>
                <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)} style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none' }}>
                  <option value="unica">Única</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>

            {erro && <p style={{ color: '#C2453D', fontSize: 13, margin: '12px 0 0' }}>{erro}</p>}

            <button onClick={salvarNova} disabled={salvando} style={{ width: '100%', marginTop: 20, padding: '15px', background: 'linear-gradient(180deg,#F5D97A 0%,#D4AF37 45%,#8C6D1F 100%)', border: 'none', borderRadius: 12, color: '#050505', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : 'Adicionar conta'}
            </button>
          </div>
        </div>
      )}

      {editandoConta && (
        <EditarConta
          conta={editandoConta}
          onClose={() => setEditandoConta(null)}
          onSalvo={() => { carregar(); setEditandoConta(null); }}
        />
      )}
    </div>
  );
}
