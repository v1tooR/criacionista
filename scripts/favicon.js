/**
 * Gera o favicon a partir do símbolo do logo (o balão com o globo),
 * não do logo horizontal inteiro — que, espremido num quadrado, vira borrão.
 *
 *   node scripts/favicon.js
 *
 * Detecta o símbolo pela primeira faixa vertical vazia do PNG (o espaço entre
 * o símbolo e o lettering), recorta em quadrado e exporta nos tamanhos usados.
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(__dirname, '..');
const ORIGEM = path.join(ROOT, 'assets/logo.png');
const SAIDAS = [
  { arq: 'assets/favicon-32.png', px: 32 },
  { arq: 'assets/favicon-64.png', px: 64 },
  { arq: 'assets/favicon-180.png', px: 180 },
];
const MARGEM = 0.015; // respiro mínimo: o ícone precisa ocupar o quadrado inteiro em 16px

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const dataUrl = 'data:image/png;base64,' + fs.readFileSync(ORIGEM).toString('base64');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fav-'));
const pageFile = path.join(work, 'p.html');

fs.writeFileSync(pageFile, `<!doctype html><meta charset="utf-8"><body><script>
window.__done = false;
var img = new Image();
img.onload = function(){
  var w = img.naturalWidth, h = img.naturalHeight;
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  var p = ctx.getImageData(0, 0, w, h).data;

  var colunaVazia = function(x){
    for (var y = 0; y < h; y++){ if (p[(y*w + x)*4 + 3] > 12) return false; }
    return true;
  };

  // acha o fim do símbolo: primeira sequência larga de colunas vazias
  var fimSimbolo = w, vazias = 0, minGap = Math.round(w * 0.02);
  for (var x = 0; x < w; x++){
    if (colunaVazia(x)){
      vazias++;
      if (vazias >= minGap && x > w * 0.1){ fimSimbolo = x - vazias + 1; break; }
    } else vazias = 0;
  }

  // limites verticais reais dentro dessa faixa
  var topo = h, base = -1;
  for (var yy = 0; yy < h; yy++){
    for (var xx = 0; xx < fimSimbolo; xx++){
      if (p[(yy*w + xx)*4 + 3] > 12){
        if (yy < topo) topo = yy;
        if (yy > base) base = yy;
        break;
      }
    }
  }
  if (base < 0){ topo = 0; base = h - 1; }

  var sw = fimSimbolo, sh = base - topo + 1;
  var lado = Math.max(sw, sh);
  var pad = Math.round(lado * ${MARGEM});
  var total = lado + pad * 2;
  var offX = Math.round((total - sw) / 2);
  var offY = Math.round((total - sh) / 2);

  window.__info = { origem: w + 'x' + h, simbolo: sw + 'x' + sh, quadrado: total };
  window.__saidas = {};
  ${JSON.stringify(SAIDAS.map((s) => s.px))}.forEach(function(px){
    var o = document.createElement('canvas'); o.width = px; o.height = px;
    var octx = o.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    var k = px / total;
    octx.drawImage(c, 0, topo, sw, sh, offX * k, offY * k, sw * k, sh * k);
    window.__saidas[px] = o.toDataURL('image/png');
  });
  window.__done = true;
};
img.src = ${JSON.stringify(dataUrl)};
</script>`);

const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      const p = l.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { /* subindo */ }
    await sleep(250);
  }
  throw new Error('Chrome não respondeu');
}
function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url); let id = 0; const pend = new Map();
    ws.addEventListener('open', () => res({
      send(m, p) { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); },
      close() { ws.close(); },
    }));
    ws.addEventListener('error', rej);
    ws.addEventListener('message', (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pend.has(d.id)) { const { a, b } = pend.get(d.id); pend.delete(d.id); d.error ? b(new Error(d.error.message)) : a(d.result); }
    });
  });
}

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: 'file:///' + pageFile.replace(/\\/g, '/') });
  const ev = async (e) => (await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;
  for (let i = 0; i < 80; i++) { if (await ev('window.__done === true')) break; await sleep(200); }
  if (!(await ev('window.__done === true'))) throw new Error('processamento não terminou');

  const info = JSON.parse(await ev('JSON.stringify(window.__info)'));
  console.log('logo ' + info.origem + ' -> símbolo ' + info.simbolo + ' -> quadrado ' + info.quadrado);
  for (const s of SAIDAS) {
    const dataurl = await ev('window.__saidas[' + s.px + ']');
    const destino = path.join(ROOT, s.arq);
    fs.writeFileSync(destino, Buffer.from(dataurl.split(',')[1], 'base64'));
    console.log('  ' + s.arq + ' (' + s.px + 'px, ' + fs.statSync(destino).size + ' bytes)');
  }
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); fs.rmSync(work, { recursive: true, force: true }); } catch (e) {} }, 500);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
