import { useEffect, useRef } from 'react';

export function ParticlasGlobal() {
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
      const qtd = Math.min(46, Math.round(cv.width / 22));
      pts = Array.from({ length: qtd }, () => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };

    const rodar = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);

      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;

        // Ponto dourado sutil
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.fill();
      });

      // Linhas de conexão sutis
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          const maxD = 110;
          if (d < maxD) {
            const alpha = 0.12 * (1 - d / maxD);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.lineWidth = 0.6;
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
        opacity: 0.7,
      }}
    />
  );
}
