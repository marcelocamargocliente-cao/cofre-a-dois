import { useRef, type ReactNode, type CSSProperties, type ButtonHTMLAttributes } from 'react';

interface BotaoLuzProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  variante?: 'primario' | 'secundario' | 'ghost';
}

export function BotaoLuz({ children, style, className = '', variante = 'primario', ...props }: BotaoLuzProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--x', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };

  const estilosBase: CSSProperties = variante === 'primario' ? {
    background: 'linear-gradient(180deg, #F5D97A 0%, #D4AF37 45%, #8C6D1F 100%)',
    color: '#050505',
    fontWeight: 700,
    fontSize: 16,
    borderRadius: 12,
    padding: '15px 24px',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s',
  } : variante === 'secundario' ? {
    background: 'rgba(212,175,55,0.08)',
    color: '#D4AF37',
    fontWeight: 600,
    fontSize: 14,
    borderRadius: 10,
    padding: '10px 18px',
    border: '1px solid rgba(212,175,55,0.3)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s',
  } : {
    background: 'none',
    color: '#8A8578',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'color 0.2s',
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      className={`btn-luz-${variante} ${className}`}
      style={{ ...estilosBase, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

// Hook para aplicar o efeito em qualquer elemento
export function useLuzMouse() {
  const ref = useRef<HTMLElement>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--y', `${e.clientY - rect.top}px`);
  };

  return { ref, onMouseMove };
}
