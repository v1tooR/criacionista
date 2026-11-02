/**
 * Liga a página de política de privacidade ao resto do site.
 *
 * Duas coisas, em todas as páginas:
 *   1. os links de consentimento, que apontavam para `#privacidade` com um
 *      aviso de "ainda não existe", passam a apontar para a página;
 *   2. o rodapé ganha o item "Política de privacidade" na coluna Institucional
 *      — é onde quem procura vai olhar, e página de privacidade que só existe
 *      dentro do texto de um formulário é página que ninguém acha.
 *
 * Idempotente: rodar de novo não duplica nada.
 *
 * Uso:  node scripts/liga-privacidade.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PAGINAS = [
  'home.html', 'o-clube.html', 'como-funciona.html', 'estudos.html',
  'loja.html', 'doe.html', 'concurso.html', 'contato.html',
  'politica-de-privacidade.html',
];

/* o link do rodapé entra logo antes do "Entrar / Cadastrar", que é o último
   da coluna Institucional */
const ANCORA_RODAPE = '          <li><a href="#entrar" data-wip="Entrar / Cadastrar">Entrar / Cadastrar</a></li>';
const ITEM_RODAPE = '          <li><a href="politica-de-privacidade.html">Política de privacidade</a></li>';

/* as duas formas que o protótipo usa para o mesmo link */
const LINKS = [
  '<a href="#privacidade" data-wip="/politica-de-privacidade">Política de privacidade</a>',
  '<a href="#privacidade" data-wip="Política de privacidade">Política de privacidade</a>',
];
const LINK_BOM = '<a href="politica-de-privacidade.html">Política de privacidade</a>';

let totalLinks = 0, totalRodapes = 0;

for (const nome of PAGINAS) {
  const arq = path.join(RAIZ, nome);
  if (!fs.existsSync(arq)) { console.error('faltando: ' + nome); process.exit(1); }
  let s = fs.readFileSync(arq, 'utf8');
  const antes = s;

  for (const velho of LINKS) {
    const n = s.split(velho).length - 1;
    if (n) { s = s.split(velho).join(LINK_BOM); totalLinks += n; }
  }

  if (!s.includes(ITEM_RODAPE)) {
    if (!s.includes(ANCORA_RODAPE)) {
      console.error('âncora do rodapé não encontrada em ' + nome + ' — o rodapé mudou de forma.');
      process.exit(1);
    }
    s = s.replace(ANCORA_RODAPE, ITEM_RODAPE + '\n' + ANCORA_RODAPE);
    totalRodapes++;
  }

  if (s !== antes) fs.writeFileSync(arq, s);
  console.log('  ' + nome);
}

console.log('\nlinks de consentimento religados: ' + totalLinks);
console.log('rodapés com o novo item: ' + totalRodapes);
