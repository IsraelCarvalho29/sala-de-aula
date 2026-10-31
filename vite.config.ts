import { createReadStream, readFileSync } from 'node:fs';
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

// base './' permite publicar em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({
  plugins: [react(), runtimesLocais()],
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
