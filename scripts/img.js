/**
 * Recorte + transparência + redimensionamento de imagens, via Chrome headless.
 * Não depende de ImageMagick nem de módulos npm.
 *
 *   node scripts/img.js <entrada> <saida.png> [larguraMax] [keepbg]
 *
 * O fundo branco é removido por preenchimento a partir das bordas, então o branco
 * interno da arte (o balão do logo, por exemplo) é preservado. Passe "keepbg"
 * para manter o fundo original.
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const [, , inFile, outFile, maxWArg, keepArg] = process.argv;
if (!inFile || !outFile) {
  console.error('uso: node scripts/img.js <entrada> <saida.png> [larguraMax] [keepbg]');
  process.exit(1);
}
const maxW = parseInt(maxWArg, 10) || 0;
const keepBg = String(keepArg) === 'keepbg';

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const ext = path.extname(inFile).toLowerCase().replace('.', '') || 'png';
const mime = ext === 'jpg' ? 'jpeg' : ext;

// o formato de saída vem da extensão pedida: PNG para arte com transparência,
// JPEG/WebP para foto (PNG de foto fica desnecessariamente pesado)
const outExt = path.extname(outFile).toLowerCase().replace('.', '') || 'png';
const outMime = outExt === 'jpg' ? 'jpeg' : outExt;
const dataUrl = 'data:image/' + mime + ';base64,' + fs.readFileSync(inFile).toString('base64');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'img-'));
const pageFile = path.join(work, 'p.html');
fs.writeFileSync(pageFile, `<!doctype html><meta charset="utf-8"><body><script>
window.__done = false;
var img = new Image();
img.onload = function(){
  var w = img.naturalWidth, h = img.naturalHeight;
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  var d = ctx.getImageData(0, 0, w, h), p = d.data;
  var keepBg = ${keepBg};

  var isBg = function(i){ return p[i+3] < 8 || (p[i] > 246 && p[i+1] > 246 && p[i+2] > 246); };

  // preenchimento a partir das bordas: só o fundo externo vira transparente
  var seen = new Uint8Array(w * h), stack = [];
  for (var x = 0; x < w; x++){ stack.push(x, x + (h-1)*w); }
  for (var y = 0; y < h; y++){ stack.push(y*w, y*w + w - 1); }
  while (stack.length){
    var q = stack.pop();
    if (q < 0 || q >= w*h || seen[q]) continue;
    if (!isBg(q*4)) continue;
    seen[q] = 1;
    var qx = q % w, qy = (q / w) | 0;
    if (qx > 0) stack.push(q-1);
    if (qx < w-1) stack.push(q+1);
    if (qy > 0) stack.push(q-w);
    if (qy < h-1) stack.push(q+w);
  }
  if (!keepBg){ for (var k = 0; k < w*h; k++){ if (seen[k]) p[k*4+3] = 0; } }
  ctx.putImageData(d, 0, 0);

  // recorte pelo conteúdo (o que não foi marcado como fundo externo)
  var minX = w, minY = h, maxX = -1, maxY = -1;
  for (var yy = 0; yy < h; yy++){
    for (var xx = 0; xx < w; xx++){
      if (!seen[yy*w + xx]){
        if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
      }
    }
  }
  if (maxX < 0){ minX = 0; minY = 0; maxX = w-1; maxY = h-1; }
  var cw = maxX - minX + 1, ch = maxY - minY + 1;

  var scale = ${maxW} > 0 && cw > ${maxW} ? ${maxW} / cw : 1;
  var ow = Math.round(cw * scale), oh = Math.round(ch * scale);
  var o = document.createElement('canvas'); o.width = ow; o.height = oh;
  var octx = o.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, minX, minY, cw, ch, 0, 0, ow, oh);

  window.__info = { src: w + 'x' + h, crop: cw + 'x' + ch, out: ow + 'x' + oh };
  var fmt = ${JSON.stringify(outMime)};
  window.__out = fmt === 'png' ? o.toDataURL('image/png') : o.toDataURL('image/' + fmt, 0.82);
  window.__done = true;
};
img.src = ${JSON.stringify(dataUrl)};
</script>`);

const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });
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
    const ws = new WebSocket(url);
    let id = 0; const pend = new Map();
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
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: 'file:///' + pageFile.replace(/\\/g, '/') });

  const ev = async (e) => (await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;
  for (let i = 0; i < 80; i++) { if (await ev('window.__done === true')) break; await sleep(250); }
  if (!(await ev('window.__done === true'))) throw new Error('processamento não terminou');

  const info = await ev('JSON.stringify(window.__info)');
  const out = await ev('window.__out');
  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(out.split(',')[1], 'base64'));
  const i = JSON.parse(info);
  console.log(path.basename(outFile) + ': ' + i.src + ' -> recorte ' + i.crop + ' -> saída ' + i.out +
              ' (' + Math.round(fs.statSync(outFile).size / 1024) + ' KB)');

  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); fs.rmSync(work, { recursive: true, force: true }); } catch (e) {} }, 500);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
