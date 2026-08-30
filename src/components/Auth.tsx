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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse at top, #1a1200 0%, #050505 60%)' }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="titulo-principal gradiente-ouro-xl" style={{ marginBottom: 8 }}>
            COFRE<br />A DOIS
          </h1>
          <p className="subtitulo" style={{ marginTop: 12 }}>
            Finanças compartilhadas para casais
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F2EFE6', marginBottom: 20 }}>
            {isLogin ? 'Entrar no cofre' : 'Criar minha conta'}
          </h2>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <p style={{ color: '#C2453D', fontSize: 13 }}>{error}</p>}

            <button type="submit" className="btn-primario" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ margin: '0 auto' }} /> : (isLogin ? 'Entrar' : 'Cadastrar')}
            </button>
          </form>

          <div className="divisor-ouro" style={{ margin: '20px 0' }} />

          <button onClick={() => setIsLogin(!isLogin)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8A8578', letterSpacing: '0.02em' }}>
            {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
            <span style={{ color: '#D4AF37', fontWeight: 600 }}>{isLogin ? 'Cadastre-se' : 'Entre'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
