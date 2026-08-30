import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, Copy, Check } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [view, setView] = useState<'options' | 'create' | 'join' | 'inviteCode'>('options');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupleName, setCoupleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: casalData, error: casalError } = await supabase
        .from('casais').insert({ nome: coupleName, criado_por: userId }).select().single();
      if (casalError) throw casalError;
      const casalId = casalData.id;
      const { error: membroError } = await supabase
        .from('membros').insert({ casal_id: casalId, user_id: userId, apelido: 'Eu', cor: '#D4AF37' });
      if (membroError) throw membroError;
      const code = generateInviteCode();
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 7);
      const { error: conviteError } = await supabase
        .from('convites').insert({ casal_id: casalId, token_hash: code, criado_por: userId, expira_em: expiraEm.toISOString() });
      if (conviteError) throw conviteError;
      setInviteCode(code);
      setView('inviteCode');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar o cofre.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: conviteData, error: conviteError } = await supabase
        .from('convites').select('*').eq('token_hash', joinCode.toUpperCase()).is('usado_em', null).single();
      if (conviteError || !conviteData) throw new Error('Convite inválido ou expirado.');
      if (new Date(conviteData.expira_em) < new Date()) throw new Error('Este convite expirou.');
      const casalId = conviteData.casal_id;
      const { error: membroError } = await supabase
        .from('membros').insert({ casal_id: casalId, user_id: userId, apelido: 'Parceiro', cor: '#3FA96A' });
      if (membroError) throw membroError;
      await supabase.from('convites').update({ usado_em: new Date().toISOString(), usado_por: userId }).eq('id', conviteData.id);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no cofre.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center mb-4">
          <h1 className="font-anton text-4xl gradiente-ouro mb-2 tracking-wide">COFRE A DOIS</h1>
        </div>
        {view === 'options' && (
          <div className="card flex flex-col gap-4">
            <h2 className="text-xl font-semibold mb-2">Bem-vindo!</h2>
            <p className="text-texto-fraco text-sm mb-4">Você ainda não está em um cofre. Escolha uma opção para começar.</p>
            <button onClick={() => setView('create')} className="btn-primario">Criar meu cofre</button>
            <button onClick={() => setView('join')} className="w-full p-3 rounded-lg border border-texto-fraco text-texto font-semibold hover:border-ouro transition-colors">Entrar com convite</button>
          </div>
        )}
        {view === 'create' && (
          <div className="card">
            <button onClick={() => setView('options')} className="text-texto-fraco hover:text-ouro mb-6 flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-semibold mb-6">Criar cofre</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-texto-fraco mb-1" htmlFor="coupleName">Nome do Casal</label>
                <input id="coupleName" type="text" required value={coupleName} onChange={(e) => setCoupleName(e.target.value)} placeholder="Ex: Ana e João" />
              </div>
              {error && <p className="text-vermelho text-sm mt-1">{error}</p>}
              <button type="submit" className="btn-primario mt-4" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar e Gerar Convite'}
              </button>
            </form>
          </div>
        )}
        {view === 'inviteCode' && (
          <div className="card flex flex-col items-center text-center">
            <h2 className="text-xl font-semibold mb-2">Cofre criado!</h2>
            <p className="text-texto-fraco text-sm mb-6">Compartilhe o código com a sua pessoa parceira.</p>
            <div className="w-full bg-preto border border-ouro rounded-lg p-6 mb-6 flex items-center justify-center gap-4 relative">
              <span className="font-anton text-3xl tracking-widest text-ouro">{inviteCode}</span>
              <button onClick={copyToClipboard} className="absolute right-4 text-texto-fraco hover:text-ouro transition-colors">
                {copied ? <Check className="w-5 h-5 text-verde" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <button onClick={onComplete} className="btn-primario">Ir para o meu cofre</button>
          </div>
        )}
        {view === 'join' && (
          <div className="card">
            <button onClick={() => setView('options')} className="text-texto-fraco hover:text-ouro mb-6 flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-semibold mb-6">Entrar com convite</h2>
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-texto-fraco mb-1" htmlFor="joinCode">Código de 6 letras</label>
                <input id="joinCode" type="text" required maxLength={6} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="font-anton tracking-widest text-lg" placeholder="ABCDEF" />
              </div>
              {error && <p className="text-vermelho text-sm mt-1">{error}</p>}
              <button type="submit" className="btn-primario mt-4" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Cofre'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
