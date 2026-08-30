import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trash2, ChevronDown } from 'lucide-react';

interface Conta {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  recorrencia: string;
  pago: boolean;
}

interface EditarContaProps {
  conta: Conta;
  onClose: () => void;
  onSalvo: () => void;
}

export function EditarConta({ conta, onClose, onSalvo }: EditarContaProps) {
  const [descricao, setDescricao] = useState(conta.descricao);
  const [valorCentavos, setValorCentavos] = useState(String(Math.round(conta.valor * 100)));
  const [vencimento, setVencimento] = useState(conta.vencimento);
  const [recorrencia, setRecorrencia] = useState(conta.recorrencia);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [erro, setErro] = useState('');

  const valorFormatado = () => {
    if (!valorCentavos) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(valorCentavos) / 100);
  };

  const salvar = async () => {
    if (!descricao.trim() || !valorCentavos || parseInt(valorCentavos) === 0 || !vencimento) {
      setErro('Preencha todos os campos.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('contas_a_pagar').update({
      descricao: descricao.trim(),
      valor: parseInt(valorCentavos) / 100,
      vencimento,
      recorrencia,
    }).eq('id', conta.id);

    if (error) { setErro(error.message); setSalvando(false); return; }
    onSalvo();
    onClose();
  };

  const excluir = async () => {
    setExcluindo(true);
    await supabase.from('contas_a_pagar').delete().eq('id', conta.id);
    onSalvo();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
      <div style={{ position: 'relative', backgroundColor: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(212,175,55,0.2)', padding: '20px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#F2EFE6' }}>Editar conta</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8578' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor</label>
            <input type="tel" inputMode="numeric"
              value={valorFormatado().replace('R$', '').trim()}
              onChange={e => setValorCentavos(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#D4AF37', fontSize: 20, fontFamily: 'Anton, sans-serif', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vencimento</label>
            <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, boxSizing: 'border-box', outline: 'none', colorScheme: 'dark' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recorrência</label>
            <div style={{ position: 'relative' }}>
              <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)}
                style={{ width: '100%', padding: '12px 40px 12px 14px', backgroundColor: '#1a1a1a', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 12, color: '#F2EFE6', fontSize: 15, appearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
                <option value="unica">Única</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#8A8578', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {erro && <p style={{ color: '#C2453D', fontSize: 13, margin: '16px 0 0' }}>{erro}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
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
              <Trash2 size={16} /> Excluir conta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
