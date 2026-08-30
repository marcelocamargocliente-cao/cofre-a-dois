import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Status = 'loading' | 'ok' | 'erro'

export default function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    supabase
      .from('casais')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        setStatus(error ? 'erro' : 'ok')
      })
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
      }}
    >
      <h1
        className="font-anton gradiente-ouro"
        style={{ fontSize: 48, letterSpacing: '-0.01em', margin: 0 }}
      >
        COFRE A DOIS
      </h1>
      <p style={{ color: '#8A8578', fontSize: 16, margin: 0 }}>
        Financas compartilhadas para casais
      </p>
      <div className="card" style={{ padding: 20, textAlign: 'center', minWidth: 280 }}>
        {status === 'loading' && (
          <p style={{ color: '#8A8578', margin: 0 }}>Conectando ao banco...</p>
        )}
        {status === 'ok' && (
          <p style={{ color: '#3FA96A', margin: 0 }}>Banco conectado com sucesso</p>
        )}
        {status === 'erro' && (
          <p style={{ color: '#C2453D', margin: 0 }}>Erro ao conectar ao banco</p>
        )}
      </div>
    </div>
  )
}
