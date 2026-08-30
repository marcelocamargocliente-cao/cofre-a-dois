import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'erro'>('loading')

  useEffect(() => {
    supabase.from('casais').select('id').limit(1)
      .then(({ error }) => setStatus(error ? 'erro' : 'ok'))
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 24,
    }}>
      <h1 className="font-anton text-5xl gradiente-ouro" style={{ letterSpacing: '-0.01em' }}>
        COFRE A DOIS
      </h1>
      <p style={{ color: '#8A8578', fontSize: 16 }}>
        Finanças compartilhadas para casais
      </p>
      <div className="card" style={{ padding: 20, textAlign: 'center', minWidth: 280 }}>
        {status === 'loading' && <p style={{ color: '#8A8578' }}>Conectando ao banco...</p>}
        {status === 'ok' && <p style={{ color: '#3FA96A' }}>✓ Banco conectado com sucesso</p>}
        {status === 'erro' && <p style={{ color: '#C2453D' }}>✗ Erro ao conectar ao banco</p>}
      </div>
    </div>
  )
}