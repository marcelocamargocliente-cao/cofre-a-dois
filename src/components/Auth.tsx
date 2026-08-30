import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="font-anton text-4xl gradiente-ouro mb-2 tracking-wide">COFRE A DOIS</h1>
          <p className="text-texto-fraco text-sm">Finanças compartilhadas para casais</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">{isLogin ? 'Entrar no cofre' : 'Criar minha conta'}</h2>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-texto-fraco mb-1" htmlFor="email">E-mail</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm text-texto-fraco mb-1" htmlFor="password">Senha</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-vermelho text-sm mt-1">{error}</p>}
            <button type="submit" className="btn-primario mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-texto-fraco hover:text-ouro transition-colors">
              {isLogin ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
