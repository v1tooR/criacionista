/**
 * Duas coisas, só em produção:
 *
 * 1. Pré-lançamento (SOMENTE_HOME, src/config.ts): a raiz mostra a página de
 *    aviso (/lancamento); fora dela e da política, todo endereço mostra a mesma
 *    página com noindex (/em-breve), no mesmo endereço; as rotas do
 *    clube respondem 404. Arquivos (CSS, imagens) e as rotas internas do Wix
 *    passam direto.
 *
 * 2. Redirecionamentos 301 das URLs do site antigo. O mapa é o mesmo do
 *    astro.config (REDIRECTS, em src/config.ts). Lá ele vira um arquivo
 *    `_redirects`, que a hospedagem do Wix ignora: no ensaio de 26/10/2026,
 *    `/institucional` respondeu 404. Aqui o servidor responde o 301.
 *
 * Na prévia (PRODUCAO = false) não faz nada: lá os redirecionamentos são as
 * páginas de meta refresh que o Astro gera.
 */
import { defineMiddleware } from 'astro:middleware';
import type { MiddlewareHandler } from 'astro';
import { PRODUCAO, REDIRECTS, SOMENTE_HOME, ABERTAS_SO_HOME, PREFIXOS_ABERTOS_SO_HOME } from './config';

const normaliza = (caminho: string) => {
  let p = caminho;
  try { p = decodeURIComponent(p); } catch { /* fica como veio */ }
  return p.replace(/\/+$/, '') || '/';
};

const MAPA = new Map(Object.entries(REDIRECTS).map(([de, para]) => [normaliza(de), para]));
const ABERTAS = new Set(ABERTAS_SO_HOME);

/** Arquivo (tem extensão) ou rota interna do Wix/Astro (/_astro, /_wix…). */
const ehArquivoOuInterna = (p: string) => p.startsWith('/_') || /\.[a-z0-9]{2,5}$/i.test(p);

/**
 * Tags de SEO que a integração do Wix injeta (@wix/astro, módulo htmlEmbeds).
 *
 * Ela busca os "scripts do site" no Wix e põe no <head> um segundo <title>, outro
 * canonical e og:title genéricos ("Home | Clube Criacionista", "Post | …"),
 * todos com o atributo wix-seo-tag. Visto na simulação de 27/10/2026. Os nossos
 * títulos e descrições são por página; os do Wix brigariam com eles no Google e
 * no WhatsApp. Saem só essas tags: os scripts de estatística do Wix, que a mesma
 * integração injeta no fim do <body>, ficam (alimentam o painel do cliente).
 *
 * O middleware dela roda depois deste (order: 'post'), então a resposta que
 * volta do `seguir()` já vem com as tags.
 */
const SEO_DO_WIX = /<(title|script)\b[^>]*\bwix-seo-tag\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:meta|link)\b[^>]*\bwix-seo-tag\b[^>]*>/gi;

async function semSeoDoWix(resposta: Response): Promise<Response> {
  if (!resposta.body || !(resposta.headers.get('content-type') || '').includes('text/html')) return resposta;
  const html = await resposta.text();
  const cabecalhos = new Headers(resposta.headers);
  cabecalhos.delete('content-length');
  return new Response(html.replace(SEO_DO_WIX, ''), { status: resposta.status, statusText: resposta.statusText, headers: cabecalhos });
}

export const onRequest = defineMiddleware(async (contexto: Parameters<MiddlewareHandler>[0], seguir: Parameters<MiddlewareHandler>[1]) => semSeoDoWix((await rotear(contexto, seguir)) as Response));

const rotear: MiddlewareHandler = (contexto, seguir) => {
  if (!PRODUCAO) return seguir();
  const p = normaliza(contexto.url.pathname);

  if (SOMENTE_HOME) {
    if (p.startsWith('/api/')) {
      // login do Wix segue funcionando; as rotas do clube ficam fechadas
      if (p.startsWith('/api/auth/')) return seguir();
      return new Response(JSON.stringify({ erros: { geral: 'Em breve.' } }), {
        status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    // a raiz mostra a página de aviso do pré-lançamento (indexável)
    if (p === '/') return contexto.rewrite('/lancamento');
    if (ABERTAS.has(p) || PREFIXOS_ABERTOS_SO_HOME.some((x) => p.startsWith(x)) || ehArquivoOuInterna(p)) return seguir();
    return contexto.rewrite('/em-breve');
  }

  const alvo = MAPA.get(p);
  if (alvo) return new Response(null, { status: 301, headers: { Location: alvo } });
  return seguir();
};
