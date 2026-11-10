/*
 * Service worker da Sala de Aula (modo offline).
 * Este arquivo é um modelo: o build (plugin "pwa" em vite.config.ts) preenche a
 * versão e as listas de arquivos (marcadores entre __) e grava dist/sw.js.
 *
 * - O app (HTML, JS, CSS, ícones, aulas) é baixado na instalação: depois da
 *   primeira visita, tudo abre sem internet.
 * - Os runtimes grandes (Python ~12 MB, SQLite) só entram no cache quando uma aula
 *   os usa ou quando o aluno pede "Baixar para usar offline" na página inicial.
 * - Uma versão nova fica esperando até o aluno clicar em "Atualizar", para não
 *   trocar os arquivos no meio de uma aula.
 */
const VERSAO = '__VERSAO__';
const ARQUIVOS = __ARQUIVOS__;
const RUNTIMES = __RUNTIMES__;
const CACHE_APP = `sala-de-aula-app-${VERSAO}`;
const CACHE_RUNTIMES = `sala-de-aula-runtimes-__VERSAO_RUNTIMES__`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_APP).then((c) => c.addAll(['./', ...ARQUIVOS])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('sala-de-aula-') && n !== CACHE_APP && n !== CACHE_RUNTIMES).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'atualizar') self.skipWaiting();
  if (e.data === 'baixar-runtimes') {
    e.waitUntil(
      caches.open(CACHE_RUNTIMES).then(async (c) => {
        let feitos = 0;
        for (const r of RUNTIMES) {
          if (!(await c.match(r))) await c.add(r);
          feitos++;
          e.source?.postMessage({ tipo: 'runtimes', feitos, total: RUNTIMES.length });
        }
      }).catch((erro) => e.source?.postMessage({ tipo: 'runtimes', erro: String(erro) })),
    );
  }
  if (e.data === 'estado-runtimes') {
    e.waitUntil(
      caches.open(CACHE_RUNTIMES).then(async (c) => {
        const ok = await Promise.all(RUNTIMES.map((r) => c.match(r)));
        e.source?.postMessage({ tipo: 'runtimes', feitos: ok.filter(Boolean).length, total: RUNTIMES.length });
      }),
    );
  }
});

const escopo = new URL(self.registration.scope);
const relativo = (url) => url.pathname.slice(escopo.pathname.length);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== escopo.origin || !url.pathname.startsWith(escopo.pathname)) return;
  const caminho = relativo(url);

  // página: rede primeiro (para ver versões novas), cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(CACHE_APP).then((c) => c.put('./', copia));
        return r;
      }).catch(() => caches.match('./', { cacheName: CACHE_APP, ignoreVary: true })),
    );
    return;
  }

  // runtimes: cache primeiro; guarda na primeira vez que uma aula usa
  if (RUNTIMES.includes(caminho)) {
    e.respondWith(
      caches.open(CACHE_RUNTIMES).then(async (c) => {
        const salvo = await c.match(caminho, { ignoreVary: true });
        if (salvo) return salvo;
        const r = await fetch(req);
        if (r.ok) c.put(caminho, r.clone());
        return r;
      }),
    );
    return;
  }

  // arquivos do app (nomes com hash): cache primeiro
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((salvo) => salvo || fetch(req)));
});
