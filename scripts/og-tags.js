/**
 * Insere (ou atualiza) as metatags de compartilhamento nas 8 páginas do protótipo.
 *
 *   node scripts/og-tags.js [urlBase]
 *
 * Sem elas, um link colado no WhatsApp aparece como texto cru — sem título, sem
 * imagem. Para um clube que circula entre famílias, isso é o cartão de visita.
 *
 * O título e a descrição de cada página são lidos da própria página, então basta
 * rodar de novo depois de mudar qualquer um dos dois. O bloco é delimitado por
 * marcadores e substituído inteiro a cada execução.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Endereço público da prévia. Troca no dia em que o site virar o definitivo. */
const BASE = (process.argv[2] || 'https://instant-fernowjrmjwg-vtorsilvasantos-140f.wix-site-host.com')
  .replace(/\/$/, '');

const INI = '<!-- compartilhamento: gerado por scripts/og-tags.js -->';
const FIM = '<!-- /compartilhamento -->';

const ALT = 'Clube Criacionista de Ciências — duas crianças lendo juntas, com o texto '
          + '"Ciência, descobertas e fé em um só lugar".';

/** home.html é servida como raiz; as outras mantêm o nome do arquivo. */
const urlDe = (arq) => (arq === 'home.html' ? BASE + '/' : BASE + '/' + arq);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const PAGINAS = ['home.html', 'o-clube.html', 'como-funciona.html', 'estudos.html',
                 'loja.html', 'doe.html', 'concurso.html', 'contato.html'];

let n = 0;
for (const arq of PAGINAS) {
  const alvo = path.join(ROOT, arq);
  let s = fs.readFileSync(alvo, 'utf8');

  // tira um bloco anterior, para a execução ser repetível
  const antes = s.indexOf(INI);
  if (antes > -1) {
    const depois = s.indexOf(FIM, antes);
    s = s.slice(0, antes) + s.slice(depois + FIM.length + 1);
  }

  const titulo = (s.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1].trim();
  if (!titulo || !desc) { console.log('  pulou ' + arq + ' (sem título ou descrição)'); continue; }

  const bloco = [
    INI,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Clube Criacionista de Ciências">',
    '<meta property="og:locale" content="pt_BR">',
    '<meta property="og:title" content="' + esc(titulo) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + urlDe(arq) + '">',
    '<meta property="og:image" content="' + BASE + '/assets/og.jpg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + esc(ALT) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="canonical" href="' + urlDe(arq) + '">',
    FIM,
  ].join('\n');

  // entra logo depois da descrição, que é onde um leitor humano procuraria
  const marca = s.match(/<meta name="description" content="[^"]*">\n/);
  if (!marca) { console.log('  pulou ' + arq + ' (não achei onde inserir)'); continue; }
  const corte = marca.index + marca[0].length;
  s = s.slice(0, corte) + bloco + '\n' + s.slice(corte);

  fs.writeFileSync(alvo, s);
  n++;
  console.log('  ' + arq.padEnd(20) + urlDe(arq));
}

console.log('\n' + n + ' páginas com metatags de compartilhamento (imagem: ' + BASE + '/assets/og.jpg)');
