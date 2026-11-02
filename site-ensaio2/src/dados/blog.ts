/**
 * Posts do blog, lidos do site do cliente.
 *
 * Tudo aqui devolve `null` quando não dá para falar com o Wix — sem Client ID,
 * fora do ar, erro de permissão. Quem chama trata o null caindo no conteúdo
 * fixo que já existe nas páginas. Nunca lançar: uma falha de rede não pode
 * derrubar a build do site inteiro por causa de uma seção.
 */
import { media } from '@wix/sdk';
import { wix, temWix } from '../wix';
import { ricosParaHtml, primeiraImagem } from './ricos';
import { caminhoPost } from '../config';

export interface PostDoBlog {
  id: string;
  titulo: string;
  resumo: string;
  /** endereço do post no site do cliente */
  link: string;
  /** "04 jul 2023", no formato que os cards já usam */
  data: string;
  dataISO: string;
  /** nome da categoria, quando o post tem uma */
  categoria: string;
  /** a mesma categoria em forma de identificador, para o filtro por data-cat */
  categoriaSlug: string;
  /** nome de quem escreveu — o cliente fez questão de que apareça */
  autor: string;
  /** capa convertida para URL servível, ou '' quando o post não tem */
  capa: string;
  minutos: number;
}

const SITE_DO_CLIENTE = 'https://www.clubecriacionista.com';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
               'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const dataCurta = (d: Date) =>
  String(d.getUTCDate()).padStart(2, '0') + ' ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCFullYear();

/** "Momento Criacionista" -> "momento-criacionista"; post sem categoria -> "sem-categoria" */
export const paraSlug = (nome: string) => (nome || 'sem categoria')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

/**
 * A capa mora em `media.wixMedia.image`, como URI interna (`wix:image://…`) —
 * e **não** em `heroImage`, que vem nulo nos posts deste site.
 *
 * Pedimos a versão redimensionada em vez da original: a CDN do Wix entrega no
 * tamanho do card, com qualidade 85 e formato automático (WebP onde dá). A
 * proporção acompanha o 16/10 de `.card__media`, e 720px cobre telas 2x.
 */
const CAPA_L = 720;
const CAPA_A = 450;

const urlDaCapa = (post: any): string => {
  const uri = post?.media?.wixMedia?.image || post?.heroImage;
  if (!uri) return '';
  try {
    return media.getScaledToFillImageUrl(uri, CAPA_L, CAPA_A, {}) || '';
  } catch {
    try {
      return media.getImageUrl(uri).url || '';
    } catch {
      return '';
    }
  }
};

/**
 * A API traz o link com os acentos crus (`/post/critérios-de-…`). Funciona no
 * navegador, mas quebra se o endereço for copiado para um e-mail ou um atributo.
 */
const linkSeguro = (url: string) => {
  try {
    // o próprio construtor de URL já faz a codificação do caminho; aplicar
    // encodeURIComponent por cima transformaria "%C3" em "%25C3"
    const u = new URL(url);
    return u.origin + u.pathname + u.search;
  } catch {
    return url;
  }
};

// os posts deste blog são quase todos do mesmo autor e das mesmas categorias:
// buscar uma vez por execução evita dezenas de chamadas idênticas
let cacheCategorias: Map<string, string> | null = null;
const cacheAutores = new Map<string, string>();

async function nomesDasCategorias(): Promise<Map<string, string>> {
  if (cacheCategorias) return cacheCategorias;
  const mapa = new Map<string, string>();
  try {
    const r = await wix!.categories.listCategories();
    for (const c of r.categories ?? []) {
      if (c._id && c.label) mapa.set(c._id, c.label);
    }
  } catch (e) {
    // sem categorias os cards ficam sem etiqueta: degradação aceitável
    console.warn('[blog] não consegui listar as categorias: ' + (e as Error).message);
  }
  cacheCategorias = mapa;
  return mapa;
}

/** O post traz só o memberId; o nome vem do módulo de membros. */
async function nomeDoAutor(memberId?: string): Promise<string> {
  if (!memberId) return '';
  if (cacheAutores.has(memberId)) return cacheAutores.get(memberId)!;

  let nome = '';
  try {
    const m = await wix!.members.getMember(memberId);
    nome = m.profile?.nickname || m.profile?.name || '';
  } catch (e) {
    console.warn('[blog] não consegui o nome do autor ' + memberId + ': ' + (e as Error).message);
  }
  cacheAutores.set(memberId, nome);
  return nome;
}

export interface PostCompleto extends PostDoBlog {
  /** identificador do post na URL: /post/<slug> */
  slug: string;
  /** corpo já convertido em HTML */
  corpo: string;
  /** tipos de nó que o renderizador não conhece, para avisar na build */
  naoReconhecidos: string[];
  /** a capa é a primeira imagem do corpo? então não repetir no topo */
  capaNoCorpo: boolean;
}

export interface CategoriaDoBlog {
  nome: string;
  slug: string;
  total: number;
}

/**
 * As categorias que **têm post**, da mais cheia para a mais vazia.
 *
 * O blog do cliente tem categorias criadas e nunca usadas. Mostrar um filtro
 * que não devolve nada é pior do que não ter filtro, então as vazias ficam de
 * fora. No dia em que ele publicar algo numa delas, o filtro aparece sozinho —
 * sem ninguém mexer em código.
 */
export async function listarCategorias(): Promise<CategoriaDoBlog[] | null> {
  if (!temWix || !wix) return null;
  try {
    const r = await wix.categories.listCategories();
    const lista = (r.categories ?? [])
      .filter((c: any) => (c.postCount ?? 0) > 0 && c.label)
      .map((c: any): CategoriaDoBlog => ({
        nome: c.label,
        slug: paraSlug(c.label),
        total: c.postCount ?? 0,
      }))
      .sort((a, b) => b.total - a.total);
    return lista.length ? lista : null;
  } catch (e) {
    console.warn('[blog] não consegui listar as categorias: ' + (e as Error).message);
    return null;
  }
}

/**
 * Os posts mais recentes, do mais novo para o mais antigo.
 *
 * @param limite quantos trazer (o blog do cliente tem 12 no total)
 * @param categoria nome da categoria, para filtrar — ex.: "Momento Criacionista"
 */
export async function listarPosts(limite = 12, categoria?: string): Promise<PostDoBlog[] | null> {
  if (!temWix || !wix) return null;

  try {
    const cats = await nomesDasCategorias();

    // filtrar por nome exige o id: o nome é o que aparece no card, o id é o que a API aceita
    let categoryIds: string[] | undefined;
    if (categoria) {
      const id = [...cats.entries()].find(([, nome]) => nome === categoria)?.[0];
      if (!id) {
        console.warn('[blog] categoria "' + categoria + '" não existe no site; trazendo sem filtro');
      } else {
        categoryIds = [id];
      }
    }

    const r = await wix.posts.listPosts({
      sort: 'PUBLISHED_DATE_DESC',
      paging: { limit: limite },
      fieldsets: ['URL'],
      ...(categoryIds ? { categoryIds } : {}),
    });

    const crus = r.posts ?? [];
    // resolve os autores antes do map: são poucos ids distintos e o cache cuida do resto
    const autores = new Map<string, string>();
    for (const id of new Set(crus.map((p: any) => p.memberId).filter(Boolean))) {
      autores.set(id as string, await nomeDoAutor(id as string));
    }

    const lista = crus.map((p: any): PostDoBlog => {
      const quando = p.firstPublishedDate ? new Date(p.firstPublishedDate) : null;
      const url = p.url?.toString() || (p.slug ? SITE_DO_CLIENTE + '/post/' + p.slug : SITE_DO_CLIENTE + '/blog');
      const cat = (p.categoryIds ?? []).map((id: string) => cats.get(id)).find(Boolean) ?? '';
      return {
        id: p._id ?? '',
        titulo: p.title ?? '',
        resumo: p.excerpt ?? '',
        // aponta para a nossa página de post, não para o site do cliente: é
        // ela que vai responder pelo domínio depois da virada
        link: p.slug ? caminhoPost(p.slug) : linkSeguro(url),
        data: quando ? dataCurta(quando) : '',
        dataISO: quando ? quando.toISOString().slice(0, 10) : '',
        categoria: cat,
        categoriaSlug: paraSlug(cat),
        autor: autores.get(p.memberId) ?? '',
        capa: urlDaCapa(p),
        minutos: p.minutesToRead ?? 0,
      };
    });

    // uma resposta vazia não é erro, mas também não serve para montar a seção:
    // melhor o conteúdo fixo do que uma lista em branco
    return lista.length ? lista : null;
  } catch (e) {
    console.warn('[blog] não consegui ler os posts: ' + (e as Error).message);
    return null;
  }
}

/**
 * Todos os posts com o corpo já em HTML, para gerar uma página por post.
 *
 * Uma chamada só com RICH_CONTENT, em vez de uma por slug: são 12 posts, e
 * buscar de novo para cada página seria 12 idas ao Wix a cada build.
 */
export async function listarPostsCompletos(limite = 100): Promise<PostCompleto[] | null> {
  if (!temWix || !wix) return null;

  try {
    const cats = await nomesDasCategorias();

    const r = await wix.posts.listPosts({
      sort: 'PUBLISHED_DATE_DESC',
      paging: { limit: limite },
      fieldsets: ['URL', 'RICH_CONTENT'],
    });

    const crus = (r.posts ?? []) as any[];

    const autores = new Map<string, string>();
    for (const id of new Set(crus.map((p) => p.memberId).filter(Boolean))) {
      autores.set(id as string, await nomeDoAutor(id as string));
    }

    const lista = crus
      .filter((p) => p.slug)
      .map((p): PostCompleto => {
        const quando = p.firstPublishedDate ? new Date(p.firstPublishedDate) : null;
        const cat = (p.categoryIds ?? []).map((id: string) => cats.get(id)).find(Boolean) ?? '';
        const { html, naoReconhecidos } = ricosParaHtml(p.richContent);
        const idCapa = (String(p.media?.wixMedia?.image || '').match(/([0-9a-z_]+~mv2\.[a-z]+)/i) || [])[1] || '';
        const idPrimeira = primeiraImagem(p.richContent);
        return {
          id: p._id ?? '',
          slug: p.slug,
          titulo: p.title ?? '',
          resumo: p.excerpt ?? '',
          link: caminhoPost(p.slug),
          data: quando ? dataCurta(quando) : '',
          dataISO: quando ? quando.toISOString().slice(0, 10) : '',
          categoria: cat,
          categoriaSlug: paraSlug(cat),
          autor: autores.get(p.memberId) ?? '',
          capa: urlDaCapa(p),
          minutos: p.minutesToRead ?? 0,
          corpo: html,
          naoReconhecidos,
          capaNoCorpo: Boolean(idCapa && idCapa === idPrimeira),
        };
      });

    return lista.length ? lista : null;
  } catch (e) {
    console.warn('[blog] não consegui ler os posts completos: ' + (e as Error).message);
    return null;
  }
}
