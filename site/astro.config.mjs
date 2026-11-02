import { defineConfig } from 'astro/config';
import wix from '@wix/astro';
import wixPages from '@wix/astro-pages';
import react from '@astrojs/react';
import wixHostingAdapter from '@wix/astro-wix-hosting-adapter';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { REDIRECTS, PRODUCAO } from './src/config.ts';

/**
 * Refaz a limpeza que o adaptador do Wix pula quando o projeto tem o próprio
 * wrangler (ver wrangler.jsonc, que existe por causa de um bug no Windows).
 *
 * O Cloudflare deixa um wrangler.json dentro de dist/server/. O Wix envia
 * cada arquivo dessa pasta como módulo do Worker, avaliaria esse JSON como
 * JavaScript e recusaria o Worker — a build passaria e o erro só apareceria
 * no `wix preview`. É a mesma remoção que o adaptador faz em
 * removeWranglerDeployConfig().
 *
 * Também apaga dist/server/.dev.vars: o Cloudflare copia o .env.local para
 * lá, para desenvolvimento local — inclusive o WIX_CLIENT_SECRET, em texto.
 * No deploy esse arquivo não serve para nada (no Wix o segredo vem das
 * variáveis de ambiente que o attach gravou no projeto), e como o Wix envia
 * todo arquivo da pasta do servidor, ele levaria uma cópia do segredo junto.
 */
const limpaWranglerDoServidor = () => {
  let raiz, servidor;
  return {
    name: 'clube:limpa-wrangler-do-servidor',
    hooks: {
      'astro:config:done': ({ config }) => {
        raiz = fileURLToPath(config.root);
        servidor = fileURLToPath(config.build.server);
      },
      'astro:build:done': async () => {
        await Promise.all([
          rm(join(servidor, 'wrangler.json'), { force: true }),
          rm(join(servidor, '.dev.vars'), { force: true }),
          rm(join(raiz, '.wrangler/deploy/config.json'), { force: true }),
        ]);
      },
    },
  };
};

/**
 * Em produção, toda página é montada no servidor, a cada visita.
 *
 * Descoberto no ensaio de 26/10/2026 (site de teste TESTEENSAIO): a hospedagem
 * do Wix só entrega arquivo estático pelo caminho EXATO. `/o-clube.html` (ou
 * `/o-clube/index.html`) abre, mas `/o-clube` cai no servidor, que não conhece
 * páginas pré-geradas e responde 404 vazio. Nenhum projeto de referência do kit
 * usa `prerender`: todos renderizam no servidor.
 *
 * As páginas continuam declarando `prerender = true`, porque a prévia em ZIP
 * (PRODUCAO = false) é arquivo estático puro. Só na build de produção este
 * gancho vira a chave. As páginas internas de pendências (/interno) ficam de
 * fora: não são publicadas no site do cliente.
 */
const paginasNoServidor = () => ({
  name: 'clube:paginas-no-servidor',
  hooks: {
    'astro:route:setup': ({ route }) => {
      if (PRODUCAO && route.component.startsWith('src/pages/') && !route.component.startsWith('src/pages/interno/')) {
        route.prerender = false;
      }
    },
  },
});

/*
 * Configuração para a hospedagem do Wix, no formato do projeto de referência
 * do kit (.agents/skills/wix-headless-templates/members/project), sem o
 * Tailwind: nossas páginas usam o design system do protótipo.
 *
 * O que cada peça faz:
 *   - wix()        autenticação automática e as rotas /api/auth/login e
 *                  /api/auth/logout, que o botão Entrar usa em produção;
 *   - wixPages()   páginas hospedadas pelo Wix (login, checkout);
 *   - react()      exigido pelos componentes que o kit entrega — nenhuma das
 *                  nossas páginas usa React;
 *   - o adaptador  gera a build para o servidor do Wix (Cloudflare Workers).
 *
 * `output: 'server'` liga o servidor, mas as nossas páginas continuam geradas
 * na build: cada uma declara `export const prerender = true`. Só as rotas da
 * integração (login, logout) rodam por requisição. É o menor passo possível —
 * o site que o visitante vê continua sendo o mesmo HTML de antes.
 *
 * Histórico: o attach de 21/10/2026 tinha inserido `vite: { plugins:
 * [tailwindcss()] }` aqui, duplicando a chave `vite` (a segunda apagava a
 * primeira) e quebrando a build no `@import "tailwindcss"` das páginas de
 * template. As páginas foram movidas para _modelo-wix/ e o Tailwind saiu.
 * O deploy.mjs do kit (vertical forms, 21/10) reinseriu a mesma linha — se
 * aparecer de novo depois de um deploy, apague: o site não usa Tailwind.
 */
export default defineConfig({
  output: 'server',
  adapter: wixHostingAdapter(),
  integrations: [
    // robots: false — a integração traz uma rota /robots.txt que COPIA o
    // robots do site no ar (busca no domínio das páginas do Wix). Na prévia
    // isso herdaria o "pode indexar" de clubecriacionista.com. O nosso
    // (src/pages/robots.txt.ts) segue INDEXAVEL. As duas rotas juntas também
    // colidem, e o Astro avisa que a colisão vira erro fatal em versões futuras.
    wix({ robots: false }),
    wixPages(),
    react(),
    limpaWranglerDoServidor(),
    paginasNoServidor(),
  ],

  // exigido pela integração: o login volta ao site por POST vindo do domínio
  // do Wix, e a checagem de origem padrão do Astro recusaria essa volta
  security: { checkOrigin: false },

  // imagens dos posts vêm do CDN do Wix
  image: { domains: ['static.wixstatic.com'] },

  // gera o-clube.html em vez de o-clube/index.html: mantém os mesmos nomes de
  // arquivo do protótipo, então o scripts/check.js roda igual sobre a saída
  build: { format: 'file' },

  /**
   * URLs do site antigo que precisam continuar respondendo depois da virada.
   *
   * Isto vale para a prévia. Na hospedagem do Wix o `_redirects` que o Astro
   * gera é ignorado (ensaio de 26/10/2026), então em produção quem responde
   * o 301 é src/middleware.ts, com o mesmo mapa.
   *
   * O mapa mora em src/config.ts porque os destinos mudam de forma entre
   * prévia e produção (com e sem `.html`).
   */
  redirects: PRODUCAO ? {} : REDIRECTS,

  // o CSS do design system é um arquivo só, servido de public/ — não vale
  // quebrar em pedaços por página
  vite: { build: { cssCodeSplit: false } },
});
