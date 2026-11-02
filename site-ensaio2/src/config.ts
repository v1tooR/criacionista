/**
 * Interruptor único entre prévia e produção.
 *
 * Três coisas mudam no dia da virada, e esquecer qualquer uma delas estraga o
 * lançamento de um jeito difícil de perceber:
 *
 *   - o `noindex`: certo na prévia, fatal no site de verdade;
 *   - o endereço nas metatags de compartilhamento e no canônico;
 *   - os links de login, que só existem depois do `attach` ao site do cliente.
 *
 * Em vez de três lugares para lembrar, é este arquivo. Trocar PRODUCAO para
 * true e rodar a build de novo.
 */
// ENSAIO (TESTEENSAIO): modo produção, mas fora do Google
export const PRODUCAO = true;

/**
 * Pré-lançamento (pedido do cliente, 27–28/10/2026): até o lançamento formal, o
 * domínio principal mostra só a página de aviso (src/components/Lancamento.astro):
 * o nome do clube, um recado e um campo de e-mail para avisar da data. Na raiz ela
 * vai para o Google (src/pages/lancamento.astro); em qualquer outro endereço aparece
 * a mesma página, com noindex (src/pages/em-breve.astro). As rotas do clube
 * (/api/clube, /api/equipe, /api/loja) ficam fechadas. Quem faz isso é
 * src/middleware.ts.
 *
 * Exceção: a Política de privacidade, em versão enxuta (sem menu). O aceite do
 * e-mail aponta para ela.
 *
 * Só vale com PRODUCAO; a prévia em ZIP continua com todas as páginas. Para abrir
 * o site inteiro: false aqui, e build + publicação de novo.
 */
export const SOMENTE_HOME = true;
export const ABERTAS_SO_HOME = ['/', '/lancamento', '/politica-de-privacidade', '/em-breve', '/404', '/robots.txt', '/sitemap.xml'];

/**
 * Prefixos que também ficariam abertos no pré-lançamento, como os posts antigos
 * (/post/<slug>), que já estão no Google. Em 27/10 ficaram abertos; em 28/10 o
 * cliente pediu o site todo fechado até o lançamento formal. Para reabrir os
 * posts: ['/post/'].
 */
export const PREFIXOS_ABERTOS_SO_HOME: string[] = [];

/** Endereço público. Entra nas URLs absolutas das metatags e do canônico. */
export const SITE = PRODUCAO
  ? 'https://testeensaio-eliezermilitao-0b0e.wix-site-host.com'
  : 'https://instant-fernowjrmjwg-vtorsilvasantos-140f.wix-site-host.com';

/** Deixar o Google indexar. Só na produção — prévia indexada vira conteúdo duplicado. */
export const INDEXAVEL = false;

/**
 * Login ligado nos dois modos desde que o projeto foi conectado ao site do
 * cliente (21/10/2026).
 *
 * O login acontece no NOSSO formulário (src/pages/entrar.astro), que envia os
 * dados para as rotas da integração do Wix (POST /api/auth/login, /signup,
 * /verify-email). Não existe página de login do Wix no caminho.
 *
 * Na prévia estática do ZIP não há servidor: o formulário abre normalmente e,
 * ao enviar, a rota responde 404 — a página mostra que o login não funciona
 * naquele endereço. Por isso não há mais motivo para desligar o link.
 */
export const LOGIN_ATIVO = true;

/**
 * Endereço da nossa página de login, já com a volta para a página de origem.
 * `volta` precisa ser um caminho do próprio site ("/…"); o formulário repassa
 * à integração, que só aceita retorno para o mesmo site.
 */
export const entrar = (volta = '/') =>
  '/entrar' + (PRODUCAO ? '' : '.html') + '?volta=' + encodeURIComponent(volta);

/**
 * Caminho de uma página interna.
 *
 * Os dois modos servem o site de jeitos diferentes, e isso muda a forma da URL:
 *
 *   - prévia: pasta de arquivos estáticos, servida como está. Precisa do
 *     `.html`, porque host de arquivo não adivinha `/o-clube`;
 *   - produção: depois do `attach` o projeto roda em SSR, e a rota do Astro é
 *     `/o-clube` — com `.html` daria 404.
 *
 * Centralizar aqui é o que faz a virada ser uma troca de flag em vez de uma
 * caçada a links espalhados por oito páginas.
 */
export const caminho = (pagina: string, hash = '') =>
  (pagina === 'index' ? '/' : '/' + pagina + (PRODUCAO ? '' : '.html')) + hash;

/**
 * Caminho de um post.
 *
 * Em produção fica `/post/<slug>`, **exatamente** o endereço que os posts já
 * têm hoje em clubecriacionista.com — preservar isso é o que impede a virada
 * de jogar fora o histórico de busca e os links que já circulam por aí.
 *
 * Na prévia é servida uma pasta de arquivos estáticos, que não resolve caminho
 * sem extensão, então vira `/post/<slug>.html`.
 */
export const caminhoPost = (slug: string) =>
  // os slugs do cliente têm acento ("critérios-de-classificação-dos-animais").
  // O navegador até codifica sozinho, mas deixar caractere não-ASCII cru num
  // href é URI inválida — e quem copia o endereço para fora do navegador
  // (e-mail, planilha, outro programa) recebe algo quebrado.
  '/post/' + encodeURIComponent(slug) + (PRODUCAO ? '' : '.html');

/** Alvos dos redirecionamentos das URLs do site antigo. Usado no astro.config. */
export const REDIRECTS: Record<string, string> = {
  '/institucional': caminho('o-clube'),
  '/recompensas': caminho('como-funciona'),
  '/eventos': caminho('concurso'),
  '/contact-9': caminho('contato'),
  '/blog': caminho('estudos'),
  // conferidos no sitemap do site antigo em 22/10/2026
  // um por um: rota dinâmica ([categoria]) gera um redirect quebrado com build.format 'file'
  '/blog/categories/kids-lab': caminho('estudos'),
  '/blog/categories/momento-criacionista': caminho('estudos'),
  '/blog/categories/notícias': caminho('estudos'),
  '/blog/categories/not%C3%ADcias': caminho('estudos'),
  '/blog/categories/pensamento-critico': caminho('estudos'),
  '/blog/categories/sobre': caminho('estudos'),
  // os dois eventos de lá já passaram (2023 e 2025)
  '/event-details/chamada-de-resumos-cientistas-adventistas': caminho('concurso'),
  '/event-details/curso-a-questao-das-origens': caminho('concurso'),
  '/ajuda': caminho('contato'),
  '/s-projects-side-by-side': caminho('contato', '#parcerias'),  // a página antiga de parcerias (protegida por senha)
};
