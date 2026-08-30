import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCasal, setHasCasal] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkMembership(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkMembership(session.user.id);
      } else {
        setHasCasal(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMembership = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('membros').select('casal_id').eq('user_id', userId).limit(1);
      if (error) throw error;
      setHasCasal(data && data.length > 0);
    } catch {
      setHasCasal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setHasCasal(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-ouro animate-spin" />
      </div>
    );
  }

  if (!session) return <Auth />;
  if (hasCasal === false) return <Onboarding userId={session.user.id} onComplete={() => checkMembership(session.user.id)} />;
  return <Dashboard onSignOut={handleSignOut} />;
}
