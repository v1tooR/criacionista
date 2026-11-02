/**
 * Marca, no protótipo, os blocos de cards que passam a vir do blog do Wix.
 *
 *   node scripts/marcar-posts.js
 *
 * Os marcadores são comentários HTML, invisíveis no navegador: o protótipo
 * continua abrindo e funcionando sozinho, com os cards fixos. Quem os lê é o
 * scripts/port-astro.js, que troca o bloco por <CardsDePost> e devolve os cards
 * fixos como conteúdo do slot — ou seja, eles viram o plano B quando o Wix não
 * responde.
 *
 * Roda quantas vezes quiser: se já estiver marcado, não faz nada.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Cada bloco é delimitado por duas âncoras literais do protótipo. Usar o texto
 * em vez de número de linha é o que mantém isto funcionando depois de editar a
 * página — e, se a âncora sumir, o script falha em vez de marcar o lugar errado.
 */
const BLOCOS = [
  {
    arquivo: 'home.html',
    nome: 'Momento Criacionista',
    abre: '    <div class="rail" id="rail-momento" data-reveal>\n',
    fecha: '\n    </div>\n  </div>\n\n  <div class="wrap" style="margin-top:8px">',
    atributos: 'categoria="Momento Criacionista" limite="6" cor="tag--mc" chamada="Ler no blog"',
  },
  {
    arquivo: 'estudos.html',
    nome: 'Abas do acervo',
    abre: '      <div class="chips" id="chips" role="group" aria-label="Filtrar por tema">\n',
    fecha: '\n      </div>',
    atributos: '',
    marcador: 'abas',
    conta: /<button class="chip/g,
  },
  {
    arquivo: 'estudos.html',
    nome: 'Acervo de artigos',
    abre: '    <div class="grid grid--3" id="lista">\n',
    fecha: '\n    </div>\n\n    <div class="empty" id="vazio"',
    atributos: 'limite="12"',
    marcador: 'artigos',
  },
  {
    arquivo: 'home.html',
    nome: 'Notícias',
    // o <div class="grid grid--3"> se repete na página; ancorar no cabeçalho da
    // seção garante que é o das notícias
    depoisDe: '<section class="section section--soft" id="noticias">',
    abre: '    <div class="grid grid--3">\n',
    fecha: '\n    </div>\n  </div>\n  <div class="wrap totop">',
    atributos: 'categoria="Notícias" limite="3" cor="tag--news" chamada="Ler notícia" revelar',
  },
];

const INI = (marcador, attrs) =>
  '      <!-- wix:' + marcador + (attrs ? ' ' + attrs : '') + ' -->\n';
const FIM = (marcador) => '\n      <!-- /wix:' + marcador + ' -->';

let marcados = 0;

for (const b of BLOCOS) {
  const alvo = path.join(ROOT, b.arquivo);
  let s = fs.readFileSync(alvo, 'utf8');

  const base = b.depoisDe ? s.indexOf(b.depoisDe) : 0;
  if (base < 0) throw new Error(b.nome + ': âncora de seção não encontrada');

  const iAbre = s.indexOf(b.abre, base);
  if (iAbre < 0) throw new Error(b.nome + ': início do bloco não encontrado');
  const inicio = iAbre + b.abre.length;

  const iFecha = s.indexOf(b.fecha, inicio);
  if (iFecha < 0) throw new Error(b.nome + ': fim do bloco não encontrado');

  const dentro = s.slice(inicio, iFecha);

  const marcador = b.marcador || 'posts';

  if (dentro.includes('<!-- wix:')) {
    console.log('  já marcado: ' + b.nome);
    continue;
  }
  const cards = (dentro.match(b.conta || /<a class="card"|<article class="acard/g) || []).length;
  if (!cards) throw new Error(b.nome + ': nada para marcar no trecho — âncoras erradas');

  s = s.slice(0, inicio) + INI(marcador, b.atributos) + dentro + FIM(marcador) + s.slice(iFecha);
  fs.writeFileSync(alvo, s);
  marcados++;
  console.log('  ' + b.arquivo + ' · ' + b.nome + ': ' + cards + ' cards marcados');
}

console.log('\n' + marcados + ' bloco(s) marcado(s). Rode node scripts/port-astro.js em seguida.');
