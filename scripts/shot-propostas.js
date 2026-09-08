/**
 * Gera um PNG por proposta de cor da faixa do hero.
 *   node scripts/shot-propostas.js <pasta-de-saida>
 */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os');

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const outDir = process.argv[2] || 'shots';
const port = 9300 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-p-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--force-prefers-reduced-motion', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 60; i++) {
    try { const l = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      const p = l.find((t) => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) {}
    await sleep(250);
  }
  throw new Error('sem chrome');
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url); let id = 0; const pend = new Map(); const evs = new Map();
    ws.addEventListener('open', () => resolve({
      send(m, p) { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((res, rej) => pend.set(i, { res, rej })); },
      once(e) { return new Promise((res) => evs.set(e, res)); }, close() { ws.close(); },
    }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pend.has(msg.id)) { const { res, rej } = pend.get(msg.id); pend.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
      else if (msg.method && evs.has(msg.method)) { const r = evs.get(msg.method); evs.delete(msg.method); r(msg.params); }
    });
  });
}

const PROPOSTAS = [
  ['ceu', 'Céu claro'],
  ['aurora', 'Aurora'],
  ['prisma', 'Prisma'],
];

(async () => {
  try {
    const cdp = await connect(await target());
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: 'file:///C:/Users/Usuario/criacionista/home.html' });
    await loaded; await sleep(1800);
    // esconde a barra de prévia para a imagem ficar limpa
    await cdp.send('Runtime.evaluate', { expression: "document.querySelector('.pvbar').style.display='none';" });

    fs.mkdirSync(outDir, { recursive: true });
    for (const [key, label] of PROPOSTAS) {
      await cdp.send('Runtime.evaluate', {
        expression: "document.querySelector('[data-sw=\"" + key + "\"]').click();",
      });
      await sleep(700);
      const box = await cdp.send('Runtime.evaluate', {
        expression: "(function(){var r=document.querySelector('.hero').getBoundingClientRect();return JSON.stringify({y:0,h:Math.round(r.bottom)});})()",
        returnByValue: true,
      });
      const b = JSON.parse(box.result.value);
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: 1440, height: Math.min(b.h, 1100), scale: 0.75 },
      });
      const file = path.join(outDir, 'proposta-' + key + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(label + ' -> ' + file + ' (' + fs.statSync(file).size + ' bytes)');
    }
    cdp.close();
  } catch (e) { console.error('ERRO: ' + e.message); process.exitCode = 1; }
  finally { proc.kill(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
