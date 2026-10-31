import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite publicar em qualquer subpasta (ex.: GitHub Pages)
export default defineConfig({ plugins: [react()],
  base: './',
  // o Mermaid é carregado sob demanda, então um chunk grande é esperado
  build: { chunkSizeWarningLimit: 1500 }, });
