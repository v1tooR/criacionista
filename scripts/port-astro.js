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

/** href="o-clube.html#x" -> "/o-clube#x"; href="home.html" -> "/"; assets -> /assets */
const rotas = (s) => s
  .replace(/(?:src|href)="assets\//g, (m) => m.replace('"assets/', '"/assets/'))
  .replace(/href="home\.html(#[^"]*)?"/g, (_, h) => 'href="/' + (h || '') + '"')
  .replace(/href="([a-z-]+)\.html(#[^"]*)?"/g, (_, p, h) => 'href="/' + p + (h || '') + '"');

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

interface Props {
  title: string;
  desc: string;
  pvbar: string;
  rota: string;
}
const { title, desc, pvbar, rota } = Astro.props;

/**
 * Endereço público, usado para montar as URLs absolutas que o WhatsApp e o
 * Facebook exigem nas metatags de compartilhamento. Troca no dia em que este
 * projeto virar o site definitivo.
 */
const SITE = 'https://instant-fernowjrmjwg-vtorsilvasantos-140f.wix-site-host.com';
// a home é servida na raiz: apontar o canônico para /index.html criaria um
// segundo endereço para a mesma página, que é exatamente o que o canônico evita
const urlDaPagina = SITE + Astro.url.pathname.replace(/index\\.html$/, '');

const ALT_OG = 'Clube Criacionista de Ciências — duas crianças lendo juntas, com o texto '
             + '"Ciência, descobertas e fé em um só lugar".';

const MENU = [
  { href: '/',              rota: 'index',         label: 'Home' },
  { href: '/o-clube',       rota: 'o-clube',       label: 'O Clube' },
  { href: '/como-funciona', rota: 'como-funciona', label: 'Como funciona' },
  { href: '/estudos',       rota: 'estudos',       label: 'Artigos' },
  { href: 'https://www.clubecriacionista.com/blog', rota: 'blog', label: 'Blog' },
  { href: '/loja',          rota: 'loja',          label: 'Loja' },
  { href: '/concurso',      rota: 'concurso',      label: 'Concurso' },
  { href: '/contato',       rota: 'contato',       label: 'Contato' },
];
---
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>{title}</title>
<meta name="description" content={desc} />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Clube Criacionista de Ciências" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:title" content={title} />
<meta property="og:description" content={desc} />
<meta property="og:url" content={urlDaPagina} />
<meta property="og:image" content={SITE + '/assets/og.jpg'} />
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
      <a class="link-login" href="#entrar" data-wip="Entrar / Cadastrar">Entrar</a>
      <a class="btn btn--yellow btn--sm" href="/doe">Doe</a>
      <a class="btn btn--primary btn--sm" href="#cadastro" data-wip="Cadastro do membro pesquisador">Inscrever meu filho</a>
    </div>

    <button class="burger" id="burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="mnav"><span></span></button>
  </div>

  <nav class="mnav" id="mnav" aria-label="Menu principal (mobile)">
    {MENU.map((m) => <a href={m.href} class={m.rota === rota ? 'is-active' : undefined}>{m.label}</a>)}
    <a href="/doe">Doe</a>
    <a href="#entrar" data-wip="Entrar / Cadastrar">Entrar / Cadastrar</a>
    <div class="mnav__cta">
      <a class="btn btn--yellow btn--sm" href="/doe">Doe</a>
      <a class="btn btn--primary btn--sm" href="#cadastro" data-wip="Cadastro do membro pesquisador">Inscrever meu filho</a>
    </div>
  </nav>
</header>

<slot />

${rodapeLimpo.trim()}

<script is:inline src="/assets/site.js"></script>
<slot name="script" />
</body>
</html>
`;

fs.mkdirSync(path.join(SITE, 'src/layouts'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'src/pages'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'src/layouts/Base.astro'), layout);

// ---------------------------------------------------------------- páginas
let n = 0;
for (const p of PAGINAS) {
  const s = fs.readFileSync(path.join(ROOT, p.arq), 'utf8');
  const title = entre(s, '<title>', '</title>');
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
  // a barra de prévia vem inteira da página: o texto do meio muda de uma para outra
  const pvbar = rotas(entre(s, '<div class="pvbar">', '</div>')).replace(/\s+/g, ' ').trim();

  const conteudo = espacos(rotas(s.slice(s.indexOf('</header>') + '</header>'.length, s.indexOf('<footer class="ftr">')))).trim();

  // script específico da página, depois do site.js
  const depois = s.slice(s.indexOf('<script src="assets/site.js"></script>') + 38);
  const mScript = depois.match(/<script>([\s\S]*?)<\/script>/);
  const script = mScript
    ? '\n<script is:inline slot="script">' + mScript[1] + '</script>\n'
    : '';

  const astro = `---
import Base from '../layouts/Base.astro';
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
