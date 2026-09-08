/**
 * Screenshots de home.html via Chrome DevTools Protocol.
 * Permite viewport realmente pequena (mobile) e captura de página inteira.
 *
 *   node scripts/shot.js <arquivo.html> <largura> <altura> <saida.png> [full] [reduceMotion]
 *
 * Requer Node 22+ (WebSocket global) e Google Chrome instalado.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const [, , file, wArg, hArg, outArg, fullArg, rmArg] = process.argv;
if (!file) {
  console.error('uso: node scripts/shot.js <arquivo.html> <largura> <altura> <saida.png> [full] [reduce]');
  process.exit(1);
}
const width = parseInt(wArg, 10) || 1440;
const height = parseInt(hArg, 10) || 900;
const out = outArg || 'shot.png';
const full = String(fullArg) === 'full';
const reduceMotion = String(rmArg) !== 'nomotion' ? true : false;

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const args = [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + port,
  '--user-data-dir=' + profile,
  'about:blank',
];
if (reduceMotion) args.unshift('--force-prefers-reduced-motion');

const proc = spawn(chrome, args, { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* ainda subindo */ }
    await sleep(250);
  }
  throw new Error('Chrome não respondeu na porta de debug');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const events = new Map();

    ws.addEventListener('open', () => resolve({
      send(method, params) {
        const msgId = ++id;
        ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
        return new Promise((res, rej) => pending.set(msgId, { res, rej }));
      },
      once(evt) {
        return new Promise((res) => events.set(evt, res));
      },
      close() { ws.close(); },
    }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method && events.has(msg.method)) {
        const res = events.get(msg.method);
        events.delete(msg.method);
        res(msg.params);
      }
    });
  });
}

(async () => {
  try {
    const cdp = await connect(await getTarget());
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: width < 768,
    });

    const url = 'file:///' + path.resolve(file).replace(/\\/g, '/');
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url });
    await loaded;
    await sleep(1800); // fontes + imagens

    // revela tudo (caso o IntersectionObserver não tenha disparado fora da viewport)
    await cdp.send('Runtime.evaluate', {
      expression: "document.querySelectorAll('[data-reveal]').forEach(function(e){e.classList.add('is-in')});",
    });
    await sleep(400);

    const metrics = await cdp.send('Runtime.evaluate', {
      expression: 'JSON.stringify({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,cw:document.documentElement.clientWidth})',
      returnByValue: true,
    });
    const m = JSON.parse(metrics.result.value);
    console.log('viewport=' + m.cw + ' scrollWidth=' + m.sw + ' scrollHeight=' + m.sh +
                (m.sw > m.cw ? '  << OVERFLOW HORIZONTAL' : ''));

    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: full,
      clip: full ? { x: 0, y: 0, width: m.cw, height: m.sh, scale: 1 } : undefined,
    });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('gravado: ' + out + ' (' + fs.statSync(out).size + ' bytes)');

    cdp.close();
  } catch (e) {
    console.error('ERRO: ' + e.message);
    process.exitCode = 1;
  } finally {
    proc.kill();
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }, 500);
  }
})();
