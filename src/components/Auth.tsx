import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

function ParticlasOuro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let pts: { x: number; y: number; vx: number; vy: number }[] = [];

    const medir = () => {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      const qtd = Math.min(60, Math.round(cv.width / 18));
      pts = Array.from({ length: qtd }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      }));
    };

    const rodar = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);

      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;

        // Ponto dourado brilhante
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3);
        grad.addColorStop(0, 'rgba(245, 217, 122, 0.9)');
        grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Linhas de conexão
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          const maxDist = 120;
          if (d < maxDist) {
            const alpha = 0.25 * (1 - d / maxDist);
            const gradient = ctx.createLinearGradient(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
            gradient.addColorStop(0, `rgba(212, 175, 55, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(245, 217, 122, ${alpha * 1.5})`);
            gradient.addColorStop(1, `rgba(140, 109, 31, ${alpha})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(rodar);
    };

    medir();
    rodar();
    window.addEventListener('resize', medir);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

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
        setSucesso(true);
      }
    } catch (error: any) {
      setError(error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 40% 20%, #1a1200 0%, #050505 55%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Partículas animadas */}
      <ParticlasOuro />

      {/* Conteúdo */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <h1
            className="titulo-principal gradiente-ouro-xl"
            style={{ marginBottom: 8 }}
          >
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

          {sucesso ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: '#3FA96A', fontSize: 15, marginBottom: 12 }}>
                ✓ Conta criada! Verifique seu e-mail para confirmar.
              </p>
              <button
                onClick={() => { setSucesso(false); setIsLogin(true); }}
                className="btn-primario"
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8A8578', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <p style={{ color: '#C2453D', fontSize: 13 }}>{error}</p>}

              <button type="submit" className="btn-primario" disabled={loading} style={{ marginTop: 8 }}>
                {loading
                  ? <Loader2 size={20} style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                  : (isLogin ? 'Entrar' : 'Cadastrar')}
              </button>
            </form>
          )}

          {!sucesso && (
            <>
              <div className="divisor-ouro" style={{ margin: '20px 0' }} />
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8A8578', letterSpacing: '0.02em' }}
              >
                {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
                <span style={{ color: '#D4AF37', fontWeight: 600 }}>
                  {isLogin ? 'Cadastre-se' : 'Entre'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
