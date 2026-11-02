import type { APIRoute } from 'astro';
import { SITE, caminho, caminhoPost } from '../config';
import { listarPostsCompletos } from '../dados/blog';

// gerado na build, mesmo com o servidor ligado (ver astro.config.mjs)
export const prerender = true;

/**
 * sitemap.xml
 *
 * Importa pouco hoje e muito no dia da virada. Quando o nosso frontend
 * assumir o domínio, o Google precisa reaprender o site inteiro: as oito
 * páginas, que mudam de endereço, e os 12 posts, que **mantêm** o endereço
 * `/post/<slug>` justamente para não perder o histórico. Entregar essa lista
 * de uma vez é a diferença entre o buscador reindexar em dias ou em semanas.
 *
 * A lista de páginas é descoberta, não escrita à mão: página nova entra no
 * sitemap sozinha. Lista à mão envelhece em silêncio — ninguém percebe uma
 * página faltando num arquivo que ninguém abre.
 */
export const GET: APIRoute = async () => {
  const paginas = Object.keys(import.meta.glob('./*.astro'))
    .map((arq) => arq.replace(/^\.\//, '').replace(/\.astro$/, ''))
    // o 404 não é destino, é o que responde quando não há destino; o login
    // não é conteúdo — as duas levam noindex e ficam fora
    .filter((nome) => nome !== '404' && nome !== 'entrar' && nome !== 'cadastro' && nome !== 'equipe')
    .sort();

  // sem Client ID a camada de dados devolve null e o sitemap sai só com as
  // páginas fixas — melhor um sitemap parcial do que uma build quebrada
  const posts = (await listarPostsCompletos()) ?? [];

  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const entradas = [
    ...paginas.map((p) => ({ loc: SITE + caminho(p), lastmod: '' })),
    ...posts.map((p) => ({ loc: SITE + caminhoPost(p.slug), lastmod: p.dataISO })),
  ];

  const corpo = entradas
    .map(({ loc, lastmod }) =>
      '  <url>\n' +
      `    <loc>${escapar(loc)}</loc>\n` +
      (lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>\n` : '') +
      '  </url>'
    )
    .join('\n');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    corpo + '\n' +
    '</urlset>\n';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
