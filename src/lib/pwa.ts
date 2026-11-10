import { useSyncExternalStore } from 'react';

/**
 * Modo offline: registra o service worker (gerado no build a partir de pwa/sw.js),
 * avisa quando há versão nova e baixa os runtimes de código sob pedido.
 */
interface EstadoPwa {
  suportado: boolean;
  online: boolean;
  /** service worker ativo: o app já abre sem internet */
  pronto: boolean;
  atualizacao: boolean;
  runtimes?: { feitos: number; total: number; erro?: string; baixando?: boolean };
  /** o navegador ofereceu instalar o app (Chrome/Android) */
  podeInstalar: boolean;
}

interface EventoInstalar extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

let estado: EstadoPwa = {
  suportado: typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pronto: false,
  atualizacao: false,
  podeInstalar: false,
};
const ouvintes = new Set<() => void>();
const mudar = (m: Partial<EstadoPwa>) => { estado = { ...estado, ...m }; ouvintes.forEach((f) => f()); };
let esperando: ServiceWorker | null = null;
let pedidoInstalar: EventoInstalar | null = null;

export function usePwa() {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => estado);
}

export function registrarPwa() {
  addEventListener('online', () => mudar({ online: true }));
  addEventListener('offline', () => mudar({ online: false }));
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e as EventoInstalar; mudar({ podeInstalar: true }); });
  addEventListener('appinstalled', () => { pedidoInstalar = null; mudar({ podeInstalar: false }); });
  if (!estado.suportado) return;

  const sw = navigator.serviceWorker;
  sw.addEventListener('message', (e) => {
    if (e.data?.tipo === 'runtimes') {
      const { feitos = 0, total = 0, erro } = e.data;
      mudar({ runtimes: { feitos, total, erro, baixando: !erro && feitos < total && !!estado.runtimes?.baixando } });
    }
  });
  let recarregando = false;
  sw.addEventListener('controllerchange', () => {
    if (recarregando) return;
    recarregando = true;
    location.reload();
  });

  addEventListener('load', async () => {
    try {
      const reg = await sw.register('./sw.js');
      const vigiar = (w: ServiceWorker | null) => {
        if (!w) return;
        const ver = () => {
          if (w.state === 'installed' && sw.controller) { esperando = w; mudar({ atualizacao: true }); }
          if (w.state === 'activated') mudar({ pronto: true });
        };
        w.addEventListener('statechange', ver);
        ver();
      };
      if (reg.waiting && sw.controller) { esperando = reg.waiting; mudar({ atualizacao: true }); }
      vigiar(reg.installing);
      reg.addEventListener('updatefound', () => vigiar(reg.installing));
      await sw.ready;
      mudar({ pronto: true });
      sw.controller?.postMessage('estado-runtimes');
      // procura versão nova de hora em hora com o app aberto
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      mudar({ suportado: false });
    }
  });
}

export function aplicarAtualizacao() {
  esperando?.postMessage('atualizar');
}

export async function baixarRuntimes() {
  const reg = await navigator.serviceWorker.ready;
  mudar({ runtimes: { feitos: estado.runtimes?.feitos ?? 0, total: estado.runtimes?.total ?? 0, baixando: true } });
  reg.active?.postMessage('baixar-runtimes');
}

export async function instalarApp() {
  if (!pedidoInstalar) return;
  await pedidoInstalar.prompt();
  await pedidoInstalar.userChoice;
  pedidoInstalar = null;
  mudar({ podeInstalar: false });
}
