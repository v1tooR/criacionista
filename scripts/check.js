/**
 * Verificação das páginas do protótipo.
 *
 *   node scripts/check.js [pasta]        (padrão: a raiz do projeto; aceita dist/)
 *
 * Confere, em cada página e em 5 larguras:
 *  - rolagem horizontal (o erro de layout mais comum aqui);
 *  - imagens quebradas;
 *  - erros de JavaScript no console;
 *  - etiquetas posicionadas que escaparam do próprio cartão;
 *  - links internos apontando para arquivos que não existem.
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const WIDTHS = [320, 390, 768, 1024, 1440];
const PAGES = ['home.html', 'o-clube.html', 'como-funciona.html', 'estudos.html',
               'loja.html', 'doe.html', 'concurso.html', 'contato.html']
  .map((p) => (p === 'home.html' && !fs.existsSync(path.join(ROOT, 'home.html')) ? 'index.html' : p))
  .filter((p) => fs.existsSync(path.join(ROOT, p)));

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--force-prefers-reduced-motion', '--no-first-run',
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
function connect(u) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(u); let id = 0;
    const pend = new Map(), once = new Map(); let errs = [];
    ws.addEventListener('open', () => res({
      getErrs: () => errs, clearErrs: () => { errs = []; },
      send(m, p) { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); },
      once(e) { return new Promise((a) => once.set(e, a)); },
      close() { ws.close(); },
    }));
    ws.addEventListener('error', rej);
    ws.addEventListener('message', (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pend.has(d.id)) { const { a, b } = pend.get(d.id); pend.delete(d.id); d.error ? b(new Error(d.error.message)) : a(d.result); }
      else if (d.method === 'Runtime.exceptionThrown') { const x = d.params.exceptionDetails; errs.push(x.exception ? x.exception.description : x.text); }
      else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map((a) => a.value || a.description).join(' '));
      else if (d.method && once.has(d.method)) { once.get(d.method)(d.params); once.delete(d.method); }
    });
  });
}

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  let fails = 0, checks = 0;
  const links = new Set();

  for (const page of PAGES) {
    const problemas = [];
    for (const w of WIDTHS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 768 });
      cdp.clearErrs();
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: 'file:///' + path.join(ROOT, page).replace(/\\/g, '/') });
      await loaded; await sleep(w === WIDTHS[0] ? 1400 : 700);
      const ev = async (e) => (await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;
      await ev("document.querySelectorAll('[data-reveal]').forEach(function(e){e.classList.add('is-in')}); true");

      const m = JSON.parse(await ev("JSON.stringify({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})"));
      checks++;
      if (m.sw > m.cw) { problemas.push(w + 'px ESTOURO(' + m.sw + ')'); fails++; }

      if (w === 1440) {
        const quebradas = await ev("Array.from(document.images).filter(function(i){return i.complete && i.naturalWidth===0}).map(function(i){return i.getAttribute('src')}).join(', ')");
        checks++;
        if (quebradas) { problemas.push('IMG QUEBRADA: ' + quebradas); fails++; }

        const fugiu = await ev("Array.from(document.querySelectorAll('.tag, .prod__tag')).filter(function(t){var c=t.closest('article,.card,.acard,.prod,.box'); if(!c) return true; var a=t.getBoundingClientRect(), b=c.getBoundingClientRect(); return a.top < b.top - 2 || a.left < b.left - 2;}).map(function(t){return t.textContent.trim().slice(0,28)}).join(', ')");
        checks++;
        if (fugiu) { problemas.push('ETIQUETA FORA DO CARD: ' + fugiu); fails++; }

        const errs = cdp.getErrs();
        checks++;
        if (errs.length) { problemas.push('JS: ' + errs.join(' | ').slice(0, 160)); fails++; }

        const hrefs = await ev("Array.from(document.querySelectorAll('a[href]')).map(function(a){return a.getAttribute('href')}).filter(function(h){return /\\.html($|#)/.test(h)}).join('\\n')");
        hrefs.split('\n').filter(Boolean).forEach((h) => links.add(h.split('#')[0]));
      }
    }
    console.log((problemas.length ? 'FALHA ' : 'ok    ') + page + (problemas.length ? '  → ' + problemas.join(' · ') : ''));
  }

  console.log('\n--- links internos ---');
  for (const l of [...links].sort()) {
    checks++;
    if (!fs.existsSync(path.join(ROOT, l))) { console.log('FALHA destino inexistente: ' + l); fails++; }
    else console.log('ok    ' + l);
  }

  console.log('\n' + (fails === 0 ? 'TUDO OK' : fails + ' FALHA(S)') + ' em ' + checks + ' verificações.');
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }, 400);
  process.exitCode = fails ? 1 : 0;
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
