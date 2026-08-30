// Hook para gerenciar notificações do app
// Usa a Notification API nativa do browser/mobile

export interface NotifPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// Registrar o service worker
export async function registrarSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (e) {
    console.error('SW erro:', e);
    return null;
  }
}

// Pedir permissão ao usuário
export async function pedirPermissao(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Disparar notificação local (sem servidor)
export function notificar(payload: NotifPayload): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Via Service Worker (mais bonito, suporta ações)
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: payload.url || '/' },
    } as NotificationOptions);
  }).catch(() => {
    // Fallback: Notification direta
    new Notification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
    });
  });
}

// Notificações específicas do app
export const Notifs = {
  gastoLancado: (descricao: string, valor: string, quem: string) =>
    notificar({
      title: `💸 ${quem} lançou um gasto`,
      body: `${descricao} — ${valor}`,
      url: '/',
    }),

  contaVencendo: (descricao: string, dias: number) =>
    notificar({
      title: dias === 0 ? '⚠️ Conta vence hoje!' : `📅 Conta vence em ${dias} dias`,
      body: descricao,
      url: '/',
    }),

  parceiroPerguntou: () =>
    notificar({
      title: '💛 Pergunta do dia',
      body: 'Seu par está esperando sua resposta',
      url: '/',
    }),

  parceiroRespondeu: () =>
    notificar({
      title: '💛 Resposta revelada!',
      body: 'Seu par respondeu a pergunta do dia',
      url: '/',
    }),

  cofrinhoAtingido: (nome: string) =>
    notificar({
      title: '🎉 Meta atingida!',
      body: `O cofrinho "${nome}" chegou no objetivo`,
      url: '/',
    }),

  contaPaga: (descricao: string) =>
    notificar({
      title: '✅ Conta paga',
      body: `${descricao} foi marcada como paga`,
      url: '/',
    }),
};
