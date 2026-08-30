import { supabase } from '../lib/supabase';

interface DashboardProps {
  onSignOut: () => void;
}

export function Dashboard({ onSignOut }: DashboardProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="min-h-screen flex flex-col p-6 items-center justify-center">
      <div className="card w-full max-w-sm text-center">
        <h1 className="font-anton text-4xl gradiente-ouro mb-4 tracking-wide">COFRE A DOIS</h1>
        <h2 className="text-2xl font-semibold mb-6">Bem-vindo ao cofre!</h2>
        <button onClick={handleLogout} className="text-texto-fraco hover:text-vermelho transition-colors text-sm">
          Sair da conta
        </button>
      </div>
    </div>
  );
}
