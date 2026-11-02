import type { APIRoute } from 'astro';
import { SITE, INDEXAVEL } from '../config';

// gerado na build, mesmo com o servidor ligado (ver astro.config.mjs)
export const prerender = true;

/**
 * robots.txt
 *
 * É o quarto item que precisa virar junto no dia do lançamento, ao lado do
 * `noindex`, do endereço canônico e dos links de login. Por isso ele sai de
 * `INDEXAVEL` em vez de ser um arquivo fixo em public/: arquivo fixo seria
 * mais uma coisa para alguém lembrar de trocar à mão — e esquecer um
 * `Disallow: /` no ar é o tipo de erro que só aparece semanas depois, quando
 * o site não aparece em busca nenhuma.
 *
 * Na prévia o bloqueio é proposital: o endereço `instant-…wix-site-host.com`
 * serve o mesmo conteúdo de clubecriacionista.com e, indexado, disputaria
 * com o site do cliente como conteúdo duplicado.
 */
export const GET: APIRoute = () => {
  const linhas = INDEXAVEL
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${SITE}/sitemap.xml`,
      ]
    : [
        '# Prévia interna: fora do alcance dos buscadores de propósito.',
        '# Vira "Allow: /" sozinho quando PRODUCAO passar a true em src/config.ts.',
        'User-agent: *',
        'Disallow: /',
      ];

  return new Response(linhas.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
