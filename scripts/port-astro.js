/**
 * Migra o protótipo estático (8 arquivos HTML na raiz) para um projeto Astro em site/.
 *
 *   node scripts/port-astro.js
 *
 * O protótipo continua intacto na raiz: ele é a referência aprovada e a origem do
 * pacote dist/ que vai para o wix.com/headless/drop. O projeto Astro é a
 * implementação que recebe os dados do Wix depois.
 *
 * A migração é mecânica: o markup e o CSS não mudam. O que muda é onde cada parte
 * mora — a casca comum vira um layout, cada página vira uma rota.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

const PAGINAS = [
  { arq: 'home.html',          rota: 'index',         nav: 'index' },
  { arq: 'o-clube.html',       rota: 'o-clube',       nav: 'o-clube' },
  { arq: 'como-funciona.html', rota: 'como-funciona', nav: 'como-funciona' },
  { arq: 'estudos.html',       rota: 'estudos',       nav: 'estudos' },
  { arq: 'loja.html',          rota: 'loja',          nav: 'loja' },
  { arq: 'doe.html',           rota: 'doe',           nav: 'doe' },
  { arq: 'concurso.html',      rota: 'concurso',      nav: 'concurso' },
  { arq: 'contato.html',       rota: 'contato',       nav: 'contato' },
  // fora do menu de propósito: quem procura a política chega pelo rodapé ou
  // pelo link de consentimento do formulário, não pela navegação principal
  { arq: 'politica-de-privacidade.html', rota: 'politica-de-privacidade', nav: '' },
];

const entre = (s, ini, fim) => {
  const a = s.indexOf(ini);
  const b = s.indexOf(fim, a + ini.length);
  if (a < 0 || b < 0) throw new Error('trecho não encontrado: ' + ini.slice(0, 30));
  return s.slice(a + ini.length, b);
};

/**
 * O compilador do Astro remove a quebra de linha entre um texto e uma tag inline
 * que venha logo depois, e com ela some o espaço: "vira\n<strong>membro" vira
 * "viramembro". Trazer a tag para a mesma linha, com um espaço explícito, preserva
 * o texto exatamente como no protótipo.
 */
const INLINE = 'strong|em|b|i|u|a|span|code|small|abbr';
const espacos = (s) => s
  .replace(new RegExp('\\n\\s*(<(?:' + INLINE + ')\\b)', 'g'), ' $1')
  .replace(new RegExp('(</(?:' + INLINE + ')>)\\n\\s*(?=[^<\\s])', 'g'), '$1 ');

/**
 * Troca os blocos marcados por <CardsDePost>, mantendo os cards fixos dentro
 * como conteúdo do slot — eles viram o plano B de quando o Wix não responde.
 * Os marcadores são postos por scripts/marcar-posts.js.
 *
 *   <!-- wix:posts categoria="X" limite="6" revelar -->  ...cards...  <!-- /wix:posts -->
 *
 * Valores numéricos viram expressão (`limite={6}`), senão a prop chegaria como
 * texto e a paginação da API recusaria. Atributo solto vira booleano.
 */
/** nome no marcador -> componente que o substitui */
const COMPONENTES = {
  posts: 'CardsDePost',
  artigos: 'ArtigosDePost',
  abas: 'AbasDeCategoria',
};

// o espaço em branco em volta é tolerante de propósito: espacos() roda antes e
// colapsa a quebra de linha que vem logo depois do marcador de abertura
const MARCA = /([ \t]*)<!-- wix:([a-z]+)([^>]*?) -->\s*([\s\S]*?)\s*<!-- \/wix:\2 -->/g;

/** componentes usados pela página sendo gerada, para montar os imports */
let usados = new Set();

const trocarMarcadores = (s) => s.replace(MARCA, (_, ident, tipo, attrs, dentro) => {
  const comp = COMPONENTES[tipo];
  if (!comp) throw new Error('marcador desconhecido: wix:' + tipo);
  usados.add(comp);

  const props = (attrs.trim().match(/[a-zA-Z]+(?:="[^"]*")?/g) || [])
    .map((a) => {
      const [, nome, valor] = a.match(/^([a-zA-Z]+)(?:="([^"]*)")?$/) || [];
      if (valor === undefined) return nome;                    // atributo solto = true
      return /^\d+$/.test(valor) ? nome + '={' + valor + '}' : nome + '="' + valor + '"';
    })
    .join(' ');

  const abre = props ? '<' + comp + ' ' + props + '>' : '<' + comp + '>';
  return ident + abre + '\n' + dentro + '\n' + ident + '</' + comp + '>';
});

/** href="o-clube.html#x" -> "/o-clube#x"; href="home.html" -> "/"; assets -> /assets */
/**
 * Os links internos viram chamada de `caminho()` em vez de texto fixo, porque
 * a forma da URL muda entre prévia (arquivo estático, precisa do .html) e
 * produção (SSR, rota sem extensão). Ver src/config.ts.
 */
let usouCaminho = false;
const linkInterno = (pagina, hash) => {
  usouCaminho = true;
  return 'href={caminho(' + JSON.stringify(pagina)
    + (hash ? ', ' + JSON.stringify(hash) : '') + ')}';
};

let usouPost = false, usouProducao = false;
const ANTIGO = 'https://www\\.clubecriacionista\\.com';
const rotas = (s) => s
  // links absolutos para o site antigo: depois da virada o domínio é nosso, e
  // eles viram links internos (posts → /post/<slug>; blog e categorias → Artigos)
  .replace(new RegExp('href="' + ANTIGO + '/post/([^"#?]+)"', 'g'), (_, slug) => {
    usouPost = true;
    return 'href={caminhoPost(' + JSON.stringify(decodeURIComponent(slug)) + ')}';
  })
  .replace(new RegExp('href="' + ANTIGO + '/blog(?:/categories/[^"]*)?"', 'g'), () => linkInterno('estudos'))
  // marcações de lançamento: data-previa some no modo produção; data-producao só aparece nele
  .replace(/ data-previa(?![=\w-])/g, () => { usouProducao = true; return ' data-previa hidden={PRODUCAO}'; })
  .replace(/ data-producao hidden(?![=\w-])/g, () => { usouProducao = true; return ' data-producao hidden={!PRODUCAO}'; })
  .replace(/(?:src|href)="assets\//g, (m) => m.replace('"assets/', '"/assets/'))
  .replace(/href="home\.html(#[^"]*)?"/g, (_, h) => linkInterno('index', h))
  .replace(/href="([a-z-]+)\.html(#[^"]*)?"/g, (_, p, h) => linkInterno(p, h));

// ---------------------------------------------------------------- layout
const base = fs.readFileSync(path.join(ROOT, 'o-clube.html'), 'utf8');

const pvbarVazia = rotas(entre(base, '<div class="pvbar">', '</div>'))
  .replace(/<span><b>PRÉVIA<\/b>[^<]*<\/span>/, '<span><b>PRÉVIA</b> · {pvbar}</span>');
const wixbar = rotas(base.slice(base.indexOf('<!-- ============ CHAVE DE MODO'), base.indexOf('<!-- ============ HEADER')));
const header = rotas(entre(base, '<!-- ============ HEADER ============ -->', '</header>') + '</header>');
const rodape = rotas(base.slice(base.indexOf('<footer class="ftr">'), base.indexOf('<script src="/assets/site.js">') > -1
  ? base.indexOf('<script src="assets/site.js">') : base.length));
const rodapeLimpo = rotas(base.slice(base.indexOf('<footer class="ftr">'), base.indexOf('<script src="assets/site.js">')));

// o item ativo do menu é marcado em tempo de execução pelo layout
const headerSemAtivo = header.replace(/ class="is-active"/g, '');

const layout = `---
/**
 * Casca comum a todas as páginas: head, barra de prévia, chave de modo Wix,
 * cabeçalho, rodapé e os scripts compartilhados.
 *
 * O markup veio do protótipo sem alteração. A única diferença é que o item
 * ativo do menu passou a ser calculado a partir da rota, em vez de escrito à mão.
 */
import { MOSTRAR_ANDAIMES } from '../andaimes';
import { SITE, INDEXAVEL, LOGIN_ATIVO, PRODUCAO, SOMENTE_HOME, entrar, caminho } from '../config';

interface Props {
  title: string;
  desc: string;
  pvbar: string;
  rota: string;
  /** imagem de compartilhamento própria da página; sem isto usa o cartão padrão */
  imagem?: string;
  /** força \`noindex\` mesmo em produção — serve à página de erro */
  naoIndexar?: boolean;
  /** endereço oficial próprio (a página de aviso é servida na raiz por reescrita) */
  canonico?: string;
  /**
   * Casca enxuta: sem logo, menu, botões nem rodapé completo. É a do
   * pré-lançamento (PRODUCAO + SOMENTE_HOME), quando só a página de aviso e a
   * política estão abertas e o menu levaria a páginas fechadas.
   */
  simples?: boolean;
  /** na casca enxuta, sem a faixa com o nome (a página de aviso já o traz em destaque) */
  semCabecalho?: boolean;
}
const { title, desc, pvbar, rota, imagem, naoIndexar = false, canonico,
        simples = PRODUCAO && SOMENTE_HOME, semCabecalho = false } = Astro.props;

/**
 * Endereço desta página, normalizado.
 *
 * A home é servida na raiz: apontar o canônico para /index.html criaria um
 * segundo endereço para a mesma página, que é o que o canônico existe para
 * evitar. E em produção o site roda em SSR, onde a rota não tem extensão —
 * mas uma build estática feita com PRODUCAO ligado ainda reportaria o nome do
 * arquivo, então o sufixo sai aqui em vez de depender do modo de build.
 */
const semIndex = Astro.url.pathname.replace(/index\\.html$/, '');
const rotaAtual = PRODUCAO ? semIndex.replace(/\\.html$/, '') : semIndex;

const urlDaPagina = canonico ?? SITE + rotaAtual;
const imagemOg = imagem || SITE + '/assets/og.jpg';

const ALT_OG = 'Clube Criacionista de Ciências — duas crianças lendo juntas, com o texto '
             + '"Ciência, descobertas e fé em um só lugar".';

const hrefEntrar = entrar(rotaAtual);

const MENU = [
  { href: caminho('index'),         rota: 'index',         label: 'Home' },
  { href: caminho('o-clube'),       rota: 'o-clube',       label: 'O Clube' },
  { href: caminho('como-funciona'), rota: 'como-funciona', label: 'Como funciona' },
  { href: caminho('estudos'),       rota: 'estudos',       label: 'Artigos' },
  // enquanto o domínio é do site antigo, "Blog" aponta para lá. Depois da
  // virada esse endereço passa a ser nosso e cai no redirect para /estudos.
  { href: PRODUCAO ? caminho('estudos') : 'https://www.clubecriacionista.com/blog', rota: 'blog', label: 'Blog' },
  { href: caminho('loja'),          rota: 'loja',          label: 'Loja' },
  { href: caminho('concurso'),      rota: 'concurso',      label: 'Concurso' },
  { href: caminho('contato'),       rota: 'contato',       label: 'Contato' },
];
---
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content={INDEXAVEL && !naoIndexar ? 'index, follow' : 'noindex, nofollow'} />
<title>{title}</title>
<meta name="description" content={desc} />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Clube Criacionista de Ciências" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:title" content={title} />
<meta property="og:description" content={desc} />
<meta property="og:url" content={urlDaPagina} />
<meta property="og:image" content={imagemOg} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content={ALT_OG} />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href={urlDaPagina} />

<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
<link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png" />
<link rel="apple-touch-icon" href="/assets/favicon-180.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/assets/site.css" />
<link rel="stylesheet" href="/assets/wix-nativo.css" />
</head>
<body data-hero="prisma">
<script is:inline>/* aplica o modo salvo antes de pintar, para não piscar */try{if(localStorage.getItem('ccc-modo')==='nativo')document.body.setAttribute('data-wix','nativo');}catch(e){}</script>

{MOSTRAR_ANDAIMES && (
<>
<!-- ============ BARRA DE PRÉVIA (só na prévia interna) ============ -->
<div class="pvbar" set:html={pvbar}></div>
${wixbar.trim()}
</>
)}

{simples ? (
<>
{!semCabecalho && (
<header class="hdr-simples">
  <a href="/">Clube Criacionista de Ciências</a>
</header>
)}
<slot />
<footer class="ftr-simples">
  <span>© 2026 Clube Criacionista de Ciências</span>
  <a href={caminho("politica-de-privacidade")}>Política de privacidade</a>
  <a href="mailto:contato@clubecriacionista.org">contato@clubecriacionista.org</a>
</footer>
</>
) : (
<>
<!-- ============ HEADER ============ -->
<header class="hdr" id="hdr">
  <div class="hdr__in">
    <a class="brand" href="/" aria-label="Clube Criacionista de Ciências — início">
      <img class="brand__img" src="/assets/logo.png" alt="Clube Criacionista de Ciências" />
    </a>

    <nav class="nav" aria-label="Menu principal">
      {MENU.map((m) => <a href={m.href} class={m.rota === rota ? 'is-active' : undefined}>{m.label}</a>)}
    </nav>

    <div class="hdr__cta">
      <a class="link-login" data-sessao="visitante" href={hrefEntrar} data-wip={LOGIN_ATIVO ? undefined : 'Entrar / Cadastrar'}>Entrar</a>
      <span class="link-login" data-sessao="membro" data-sessao-ola hidden>Olá</span>
      <a class="link-login" data-sessao="membro" data-sair href="#sair" hidden>Sair</a>
      <a class="btn btn--yellow btn--sm" href={caminho("doe")}>Doe</a>
      <a class="btn btn--primary btn--sm" href={caminho("cadastro")}>Inscrever meu filho</a>
    </div>

    <button class="burger" id="burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="mnav"><span></span></button>
  </div>

  <nav class="mnav" id="mnav" aria-label="Menu principal (mobile)">
    {MENU.map((m) => <a href={m.href} class={m.rota === rota ? 'is-active' : undefined}>{m.label}</a>)}
    <a href={caminho("doe")}>Doe</a>
    <a data-sessao="visitante" href={hrefEntrar} data-wip={LOGIN_ATIVO ? undefined : 'Entrar / Cadastrar'}>Entrar / Cadastrar</a>
    <a data-sessao="membro" data-sair data-sessao-sair-nome href="#sair" hidden>Sair</a>
    <div class="mnav__cta">
      <a class="btn btn--yellow btn--sm" href={caminho("doe")}>Doe</a>
      <a class="btn btn--primary btn--sm" href={caminho("cadastro")}>Inscrever meu filho</a>
    </div>
  </nav>
</header>

<slot />

${rodapeLimpo.trim()
  // o "Entrar / Cadastrar" do rodapé vinha fixo do protótipo; passa pelo mesmo
  // link do cabeçalho e ganha a versão de quem já está logado
  .replace(
    '<li><a href="#entrar" data-wip="Entrar / Cadastrar">Entrar / Cadastrar</a></li>',
    '<li data-sessao="visitante"><a href={hrefEntrar}>Entrar / Cadastrar</a></li>\n          <li data-sessao="membro" hidden><a href="#sair" data-sair>Sair</a></li>'
  )}
</>
)}

<script is:inline src="/assets/site.js"></script>
<script>
  // estado de login no cabeçalho — ver src/sessao.ts
  import '../sessao';
</script>
<slot name="script" />
</body>
</html>
`;

fs.mkdirSync(path.join(SITE, 'src/layouts'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'src/pages'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'src/layouts/Base.astro'), layout);

// ---------------------------------------------------------------- formulários
/*
 * No protótipo os formulários são HTML escrito à mão com um envio de mentira
 * ("prévia"). No site em Astro quem desenha os campos é o Wix Forms, a partir
 * do esquema que o dono edita no painel (site/src/formulario-wix.ts). Aqui:
 * os campos à mão saem (do fim do .nl__sub até o .nl__msg) e entram o lugar
 * dos campos e o esquema embutido. Título, subtítulo, mensagem e notas ficam.
 */
const FORM_WIX = {
  contato: [['form-contato', 'contato']],
  index: [['form-educadores', 'newsletter']],
};
function ligarFormulario(html, id, chave, arq) {
  const re = new RegExp('<form([^>]*?)\\sid="' + id + '"([^>]*)>([\\s\\S]*?)</form>');
  const m = html.match(re);
  if (!m) throw new Error(arq + ': <form id="' + id + '"> não encontrado');
  let corpo = m[3];
  const sub = corpo.match(/<p class="nl__sub">[\s\S]*?<\/p>/);
  const fim = corpo.indexOf('<p class="nl__msg"');
  if (!sub || fim < 0) throw new Error(arq + ': #' + id + ' sem .nl__sub ou .nl__msg — o portador não sabe onde ficam os campos');
  const ini = corpo.indexOf(sub[0]) + sub[0].length;
  corpo = corpo.slice(0, ini) + '\n\n        <div data-campos></div>\n\n        ' + corpo.slice(fim);
  return html.replace(m[0],
    '<form' + m[1] + ' id="' + id + '"' + m[2] + ' data-form-wix="' + chave + '">\n' +
    '        <script is:inline type="application/json" data-esquema set:html={json(esquemas.' + chave + ')}></script>' +
    corpo + '</form>');
}

// ---------------------------------------------------------------- páginas
let n = 0;
for (const p of PAGINAS) {
  const s = fs.readFileSync(path.join(ROOT, p.arq), 'utf8');
  const title = entre(s, '<title>', '</title>');
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
  // a barra de prévia vem inteira da página: o texto do meio muda de uma para outra
  const pvbar = rotas(entre(s, '<div class="pvbar">', '</div>')).replace(/\s+/g, ' ').trim();

  usados = new Set();
  usouCaminho = false;
  usouPost = false;
  usouProducao = false;
  let usouEntrar = false;
  let conteudo = trocarMarcadores(
    espacos(rotas(s.slice(s.indexOf('</header>') + '</header>'.length, s.indexOf('<footer class="ftr">'))))
  ).trim()
    // botões "Entrar" no corpo da página vão para o nosso login, com volta
    // para a própria página
    // "Inscrever meu filho" / "Criar cadastro" vão para a inscrição (src/pages/cadastro.astro)
    .replace(/href="#cadastro" data-wip="(?:Cadastro|Inscrição) do membro pesquisador"/g, () => {
      usouCaminho = true;
      return 'href={caminho("cadastro")}';
    })
    .replace(/href="#entrar" data-wip="Entrar \/ Cadastrar"/g, () => {
      usouEntrar = usouCaminho = true;
      return 'href={entrar(caminho(' + JSON.stringify(p.rota) + '))}';
    });

  // formulários que, no site em Astro, são do Wix Forms
  const forms = FORM_WIX[p.rota] || [];
  for (const [id, chave] of forms) conteudo = ligarFormulario(conteudo, id, chave, p.arq);

  // script específico da página, depois do site.js — sem os blocos que só
  // existem no protótipo (/* prévia:inicio */ … /* prévia:fim */)
  const depois = s.slice(s.indexOf('<script src="assets/site.js"></script>') + 38);
  const mScript = depois.match(/<script>([\s\S]*?)<\/script>/);
  const corpoScript = mScript ? mScript[1].replace(/\/\* prévia:inicio[\s\S]*?\/\* prévia:fim \*\/\n?/g, '') : '';
  const script = (corpoScript.trim()
    ? '\n<script is:inline slot="script">' + corpoScript + '</script>\n'
    : '') + (forms.length
    ? "\n<script>\n  import { montarTodos } from '../formulario-wix';\n  montarTodos();\n</script>\n"
    : '');

  const astro = `---
import Base from '../layouts/Base.astro';${[...usados].sort().map((c) => "\nimport " + c + " from '../components/" + c + ".astro';").join('')}${(usouCaminho || usouPost || usouProducao) ? "\nimport { " + [usouCaminho && 'caminho', usouEntrar && 'entrar', usouPost && 'caminhoPost', usouProducao && 'PRODUCAO'].filter(Boolean).join(', ') + " } from '../config';" : ''}${forms.length ? "\nimport { esquemaNaBuild } from '../formularios';" : ''}

// gerada na build, mesmo com o servidor ligado (ver astro.config.mjs)
export const prerender = true;${forms.length ? `

// o esquema de cada formulário é lido do Wix na build e vai embutido na página
// (ver src/formularios.ts); \`<\` escapado para não fechar o <script> antes da hora
const esquemas = {${forms.map(([, c]) => ` ${c}: await esquemaNaBuild('${c}')`).join(',')} };
const json = (x: unknown) => JSON.stringify(x ?? null).replace(/</g, '\\\\u003c');` : ''}
---
<Base
  title={${JSON.stringify(title)}}
  desc={${JSON.stringify(desc)}}
  pvbar={${JSON.stringify(pvbar)}}
  rota={${JSON.stringify(p.nav)}}
>

${conteudo}
${script}</Base>
`;
  fs.writeFileSync(path.join(SITE, 'src/pages', p.rota + '.astro'), astro);
  n++;
  console.log('  src/pages/' + p.rota + '.astro  (' + Math.round(astro.length / 1024) + ' KB)');
}

// ---------------------------------------------------------------- assets
const copiar = (de, para) => {
  fs.mkdirSync(para, { recursive: true });
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    if (e.isDirectory()) copiar(path.join(de, e.name), path.join(para, e.name));
    else fs.copyFileSync(path.join(de, e.name), path.join(para, e.name));
  }
};
copiar(path.join(ROOT, 'dist/assets'), path.join(SITE, 'public/assets'));

console.log('\n' + n + ' páginas migradas + layout + assets em site/');
