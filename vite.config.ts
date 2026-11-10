import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const modulo = (caminho: string) => fileURLToPath(new URL(`./node_modules/${caminho}`, import.meta.url));
const TIPOS: Record<string, string> = { mjs: 'text/javascript', wasm: 'application/wasm', zip: 'application/zip', json: 'application/json' };
// caminho publicado -> arquivo em node_modules
const ARQUIVOS: Record<string, string> = {
  'pyodide/pyodide.mjs': modulo('pyodide/pyodide.mjs'),
  'pyodide/pyodide.asm.mjs': modulo('pyodide/pyodide.asm.mjs'),
  'pyodide/pyodide.asm.wasm': modulo('pyodide/pyodide.asm.wasm'),
  'pyodide/python_stdlib.zip': modulo('pyodide/python_stdlib.zip'),
  'pyodide/pyodide-lock.json': modulo('pyodide/pyodide-lock.json'),
  'sqljs/sql-wasm.wasm': modulo('sql.js/dist/sql-wasm-browser.wasm'),
};

/** Publica os runtimes WebAssembly (Python e SQLite) junto com o site, sem depender de CDN. */
function runtimesLocais(): Plugin {
  return {
    name: 'runtimes-locais',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const caminho = Object.keys(ARQUIVOS).find((c) => req.url?.split('?')[0].endsWith('/' + c));
        if (!caminho) return next();
        res.setHeader('Content-Type', TIPOS[caminho.split('.').pop()!]);
        createReadStream(ARQUIVOS[caminho]).pipe(res);
      });
    },
    generateBundle() {
      for (const [caminho, origem] of Object.entries(ARQUIVOS)) {
        this.emitFile({ type: 'asset', fileName: caminho, source: readFileSync(origem) });
      }
    },
  };
}

/**
 * Modo offline (PWA): depois do build, gera dist/sw.js a partir de pwa/sw.js com a
 * lista de arquivos do app. Os runtimes (pasta pyodide/ e sqljs/) ficam de fora da
 * instalação e são guardados sob demanda. Em `npm run dev` não há service worker.
 */
function pwa(): Plugin {
  let saida = 'dist';
  return {
    name: 'pwa',
    apply: 'build',
    configResolved(c) { saida = c.build.outDir; },
    closeBundle() {
      const todos = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? todos(join(dir, e.name)) : [join(dir, e.name)]));
      const arquivos = todos(saida).map((f) => relative(saida, f).split('\\').join('/')).filter((f) => f !== 'sw.js').sort();
      const ehRuntime = (f: string) => Object.keys(ARQUIVOS).includes(f);
      const hash = (lista: string[]) => {
        const h = createHash('sha256');
        for (const f of lista) h.update(f).update(readFileSync(join(saida, f)));
        return h.digest('hex').slice(0, 12);
      };
      const app = arquivos.filter((f) => !ehRuntime(f));
      const runtimes = arquivos.filter(ehRuntime);
      const sw = readFileSync(fileURLToPath(new URL('./pwa/sw.js', import.meta.url)), 'utf8')
        .replace('__VERSAO__', () => hash(app))
        .replace('__VERSAO_RUNTIMES__', () => hash(runtimes))
        .replace('__ARQUIVOS__', () => JSON.stringify(app))
        .replace('__RUNTIMES__', () => JSON.stringify(runtimes));
      writeFileSync(join(saida, 'sw.js'), sw);
    },
  };
}

// base './' permite publicar em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({
  plugins: [react(), runtimesLocais(), pwa()],
  base: './',
  worker: { format: 'es' },
  resolve: {
    alias: {
      stream: fileURLToPath(new URL('./src/lib/execucao/shim-node.ts', import.meta.url)),
      util: fileURLToPath(new URL('./src/lib/execucao/shim-node.ts', import.meta.url)),
    },
  },
  // o Mermaid e o editor de código são carregados sob demanda, então chunks grandes são esperados
  build: { chunkSizeWarningLimit: 1500 },
});
