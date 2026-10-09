import { defineConfig } from 'astro/config';

export default defineConfig({
  // gera o-clube.html em vez de o-clube/index.html: mantém os mesmos nomes de
  // arquivo do protótipo, então o scripts/check.js roda igual sobre a saída
  build: { format: 'file' },

  // o CSS do design system é um arquivo só, servido de public/ — não vale
  // quebrar em pedaços por página
  vite: { build: { cssCodeSplit: false } },
});
