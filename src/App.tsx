import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { AssinaturaRequerida } from './components/AssinaturaRequerida';
import { ParticlasGlobal } from './components/ParticlasGlobal';
import { Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCasal, setHasCasal] = useState<boolean | null>(null);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        verificarTudo(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        verificarTudo(session.user.id, session.user.email || '');
      } else {
        setHasCasal(null);
        setAssinaturaAtiva(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verificarTudo = async (userId: string, email: string) => {
    try {
      // Verificar assinatura
      const { data: sub } = await supabase
        .from('assinaturas')
        .select('status')
        .eq('user_id', userId)
        .single();

      // Verificar se tem assinatura pendente pelo email
      const { data: pending } = await supabase
        .from('assinaturas_pendentes')
        .select('status')
        .eq('email', email.toLowerCase())
        .single();

      const ativo = sub?.status === 'ativo' || pending?.status === 'ativo';

      // Se tinha pendente e agora tem user_id, migrar
      if (pending?.status === 'ativo' && !sub) {
        await supabase.from('assinaturas').upsert({
          user_id: userId,
          email: email.toLowerCase(),
          status: 'ativo',
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        await supabase.from('assinaturas_pendentes').delete().eq('email', email.toLowerCase());
      }

      setAssinaturaAtiva(ativo);

      // Verificar casal só se tiver assinatura
      if (ativo) {
        const { data } = await supabase
          .from('membros').select('casal_id').eq('user_id', userId).limit(1);
        setHasCasal(data && data.length > 0);
      }
    } catch {
      // Em caso de erro na verificação, libera o acesso
      // (evita bloquear usuário por problema técnico)
      setAssinaturaAtiva(true);
      const { data } = await supabase
        .from('membros').select('casal_id').eq('user_id', userId).limit(1);
      setHasCasal(data && data.length > 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setHasCasal(null);
    setAssinaturaAtiva(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ParticlasGlobal />
        <Loader2 className="w-8 h-8 text-ouro animate-spin" style={{ position: 'relative', zIndex: 1 }} />
      </div>
    );
  }

  if (!session) return (
    <>
      <ParticlasGlobal />
      <Auth />
    </>
  );

  // Sem assinatura ativa
  if (assinaturaAtiva === false) return (
    <>
      <ParticlasGlobal />
      <AssinaturaRequerida onSignOut={handleSignOut} />
    </>
  );

  if (hasCasal === false) return (
    <>
      <ParticlasGlobal />
      <Onboarding userId={session.user.id} onComplete={() => verificarTudo(session.user.id, session.user.email || '')} />
    </>
  );

  return (
    <>
      <ParticlasGlobal />
      <Dashboard userId={session.user.id} onSignOut={handleSignOut} />
    </>
  );
}
