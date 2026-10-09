/**
 * Monta a pasta dist/ pronta para subir no Wix Headless (wix.com/headless/drop).
 *
 *   node scripts/build-dist.js            pacote interno, com os andaimes
 *   node scripts/build-dist.js --limpo    pacote para o cliente, sem andaimes
 *
 * Andaimes são a barra "PRÉVIA · …" e a chave "Proposta completa / Piso Wix
 * nativo": ferramentas nossas para discutir o projeto, que não fazem parte do
 * site. O equivalente em site/ é o MOSTRAR_ANDAIMES de src/andaimes.ts.
 *
 * O que ele faz:
 *  - copia as 8 páginas, renomeando home.html para index.html (o Wix carrega
 *    index.html primeiro, e o index.html da raiz do repositório é o design system,
 *    que não deve virar a home do site);
 *  - reescreve os links para home.html;
 *  - copia só os arquivos realmente referenciados, para não estourar o limite;
 *  - confere os limites do Wix: 3 MB por arquivo e 20 MB no total.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PAGES = ['home.html', 'o-clube.html', 'como-funciona.html', 'estudos.html',
               'loja.html', 'doe.html', 'concurso.html', 'contato.html'];

const LIMITE_ARQUIVO = 3 * 1024 * 1024;
const LIMITE_TOTAL = 20 * 1024 * 1024;

const LIMPO = process.argv.includes('--limpo');

const M_PREVIA = '<!-- ============ BARRA DE PRÉVIA';
const M_HEADER = '<!-- ============ HEADER';

/**
 * Tira a barra de prévia e a chave de modo. As duas ficam lado a lado entre o
 * comentário da barra e o do header, então sai tudo num corte só. Se a ordem
 * mudar algum dia, o conferidor abaixo acusa em vez de engolir conteúdo.
 */
const semAndaimes = (html, pagina) => {
  const a = html.indexOf(M_PREVIA);
  const b = html.indexOf(M_HEADER);
  if (a < 0 || b < 0) throw new Error(pagina + ': não achei os marcadores dos andaimes');
  if (b < a) throw new Error(pagina + ': header antes da barra de prévia — ordem inesperada');

  const fora = html.slice(a, b);
  if (!/class="pvbar"/.test(fora) || !/class="wixbar"/.test(fora)) {
    throw new Error(pagina + ': o trecho a remover não contém as duas barras');
  }
  // guarda contra arrastar conteúdo junto: o trecho dos andaimes é pequeno
  if (fora.length > 4000) throw new Error(pagina + ': trecho grande demais (' + fora.length + ' bytes)');

  return html.slice(0, a) + html.slice(b);
};

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 1. páginas, com home.html virando index.html
const usados = new Set();
for (const page of PAGES) {
  let html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  html = html.replace(/href="home\.html(#[^"]*)?"/g, (m, hash) => `href="index.html${hash || ''}"`);
  if (LIMPO) html = semAndaimes(html, page);

  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) usados.add(m[1]);
  // a imagem de compartilhamento é citada por URL absoluta (og:image), que o
  // padrão acima não pega — ela some do pacote se não for procurada à parte
  for (const m of html.matchAll(/content="https?:\/\/[^"]*?\/(assets\/[^"]+)"/g)) usados.add(m[1]);

  const destino = page === 'home.html' ? 'index.html' : page;
  fs.writeFileSync(path.join(DIST, destino), html);
}

// 2. só os assets referenciados
for (const rel of [...usados].sort()) {
  const de = path.join(ROOT, rel);
  if (!fs.existsSync(de)) { console.log('  AUSENTE: ' + rel); continue; }
  const para = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(para), { recursive: true });
  fs.copyFileSync(de, para);
}

// 3. conferência dos limites
let total = 0, grandes = [];
const andar = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { andar(p); continue; }
    const tam = fs.statSync(p).size;
    total += tam;
    if (tam > LIMITE_ARQUIVO) grandes.push(path.relative(DIST, p) + ' (' + Math.round(tam / 1024) + ' KB)');
  }
};
andar(DIST);

const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
console.log('dist/ montada' + (LIMPO ? ' SEM andaimes (pacote do cliente):' : ' com andaimes (pacote interno):'));
console.log('  páginas: ' + PAGES.length + '  (home.html -> index.html)');
console.log('  assets copiados: ' + usados.size);
console.log('  tamanho total: ' + mb(total) + ' de ' + mb(LIMITE_TOTAL));
if (grandes.length) {
  console.log('  ACIMA DE 3 MB (o Wix rejeita):');
  grandes.forEach((g) => console.log('    - ' + g));
}
if (total > LIMITE_TOTAL) console.log('  ACIMA DO LIMITE TOTAL DE 20 MB');
if (!grandes.length && total <= LIMITE_TOTAL) console.log('  dentro dos limites do Wix Headless.');
