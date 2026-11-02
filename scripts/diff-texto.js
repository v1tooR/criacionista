/**
 * Compara o texto renderizado do protótipo (file://) com o da build Astro (http).
 * É a prova de que a migração não alterou uma vírgula do conteúdo.
 *
 *   node scripts/diff-texto.js [urlBase]      (padrão: http://localhost:4321)
 *
 * Precisa do servidor da build no ar:  cd site && npx astro preview
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(__dirname, '..');
const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const PARES = [
  ['home.html', '/'],
  ['o-clube.html', '/o-clube'],
  ['como-funciona.html', '/como-funciona'],
  ['estudos.html', '/estudos'],
  ['loja.html', '/loja'],
  ['doe.html', '/doe'],
  ['concurso.html', '/concurso'],
  ['contato.html', '/contato'],
  ['politica-de-privacidade.html', '/politica-de-privacidade'],
];

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() { for (let i = 0; i < 60; i++) { try { const l = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); const p = l.find((t) => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) {} await sleep(250); } throw new Error('Chrome não respondeu'); }
function connect(u) { return new Promise((res, rej) => { const ws = new WebSocket(u); let id = 0; const pend = new Map(), once = new Map(); ws.addEventListener('open', () => res({ send(m, p) { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); }, once(e) { return new Promise((a) => once.set(e, a)); }, close() { ws.close(); } })); ws.addEventListener('error', rej); ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const { a, b } = pend.get(d.id); pend.delete(d.id); d.error ? b(new Error(d.error.message)) : a(d.result); } else if (d.method && once.has(d.method)) { once.get(d.method)(d.params); once.delete(d.method); } }); }); }

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const ev = async (e) => (await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;

  const texto = async (url) => {
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url });
    await loaded; await sleep(900);
    // a barra de prévia e a chave de modo são andaimes nossos: estão no protótipo
    // e saem da build publicada. Comparar com elas acusaria divergência em toda
    // página, escondendo a divergência de conteúdo que é o que interessa aqui.
    await ev("document.querySelectorAll('.pvbar,.wixbar').forEach(function(e){e.remove()})");
    // as seções de blog agora vêm do Wix na build e são fixas no protótipo:
    // divergir ali é o comportamento certo, não uma quebra de fidelidade
    await ev("document.querySelectorAll('#rail-momento,#noticias .grid,#chips,#lista,#contagem').forEach(function(e){e.remove()})");
    // normaliza só espaços: diferença de quebra de linha não é diferença de conteúdo
    return (await ev("document.body.innerText")).replace(/\s+/g, ' ').trim();
  };

  let iguais = 0;
  const difs = [];

  for (const [arq, rota] of PARES) {
    const a = await texto('file:///' + path.join(ROOT, arq).replace(/\\/g, '/'));
    const b = await texto(BASE + rota);
    if (a === b) { iguais++; console.log('ok    ' + arq + '  ↔  ' + rota); continue; }

    // mostra o primeiro ponto de divergência, com contexto
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    difs.push({ arq, rota, pos: i, pro: a.slice(Math.max(0, i - 50), i + 60), ast: b.slice(Math.max(0, i - 50), i + 60) });
    console.log('DIFERE ' + arq + '  ↔  ' + rota + '  (posição ' + i + ')');
  }

  if (difs.length) {
    console.log('\n--- primeira divergência de cada página ---');
    for (const d of difs) {
      console.log('\n### ' + d.arq);
      console.log('  protótipo: …' + d.pro + '…');
      console.log('  astro:     …' + d.ast + '…');
    }
  }
  console.log('\n' + iguais + '/' + PARES.length + ' páginas com texto idêntico.');

  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }, 400);
  process.exitCode = difs.length ? 1 : 0;
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
