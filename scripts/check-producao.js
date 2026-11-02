/**
 * Verificação do site em MODO PRODUÇÃO (PRODUCAO = true), num Chrome de verdade:
 * o que o visitante VÊ não pode ter sobra de prévia.
 *
 *   - texto visível sem "A DEFINIR", "EXEMPLO", "A CONFIRMAR", "A COLETAR", "PRÉVIA";
 *   - nenhum link interno com ".html" e nenhum link para o site antigo (.com);
 *   - nenhum botão "em construção" (data-wip) visível;
 *   - robots "index", canônico no domínio de produção;
 *   - robots.txt liberado, com o sitemap.
 *
 * Uso (com a build de produção servida):  node scripts/check-producao.js [http://localhost:4400] [https://www.clubecriacionista.org]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const BASE = (process.argv[2] || 'http://localhost:4400').replace(/\/$/, '');
const DOMINIO = (process.argv[3] || 'https://www.clubecriacionista.org').replace(/\/$/, '');
const PAGINAS = ['/', '/o-clube', '/como-funciona', '/estudos', '/loja', '/doe', '/concurso', '/contato', '/politica-de-privacidade', '/cadastro', '/entrar', '/equipe'];
// em minúsculas também: as notas de prévia das páginas ("Nesta prévia…", "Texto provisório") escaparam assim
const PROIBIDO = /A DEFINIR|EXEMPLO|A CONFIRMAR|A COLETAR|PRÉVIA|[Pp]révia|[Pp]rovisóri[oa]|site atual|são exemplos|Falta definir|Proposta completa|Piso Wix/;

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map();ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}})})}

let falhas = 0, total = 0;
const conf = (nome, ok, detalhe) => { total++; if (!ok) falhas++; console.log((ok ? '  ok     ' : '  FALHA  ') + nome + (ok || !detalhe ? '' : '\n           ' + detalhe)); };

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  // as rotas /api/* não existem no servidor estático (respondem 404): a página
  // mostra o estado de "indisponível", que não interfere no que é conferido aqui
  const js = async (code) => { const r = await cdp.send('Runtime.evaluate', { expression: '(async()=>{' + code + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

  for (const p of PAGINAS) {
    console.log('\n--- ' + p + ' ---');
    await cdp.send('Page.navigate', { url: BASE + p });
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      if (await js("return document.readyState === 'complete'").catch(() => false)) break;
    }
    await sleep(600);
    const r = await js(`
      document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-in'));
      const visivel = (el) => { const s = getComputedStyle(el); return el.offsetParent !== null || s.position === 'fixed'; };
      const texto = document.body.innerText;
      const achados = (texto.match(${PROIBIDO.toString()}g) || []);
      const links = [...document.querySelectorAll('a[href]')].filter(visivel).map(a => a.getAttribute('href'));
      const html = links.filter(h => /^\\/[^?#]*\\.html(?:[?#]|$)/.test(h));
      const antigo = links.filter(h => /clubecriacionista\\.com/.test(h) && !/^mailto:/.test(h));
      const wip = [...document.querySelectorAll('[data-wip]')].filter(visivel).map(e => e.getAttribute('data-wip'));
      const robots = document.querySelector('meta[name=robots]')?.content || '';
      const canon = document.querySelector('link[rel=canonical]')?.href || '';
      return { achados, html, antigo, wip, robots, canon };`);
    conf('sem sobra de prévia no texto', !r.achados.length, JSON.stringify(r.achados));
    conf('links internos sem .html', !r.html.length, JSON.stringify(r.html.slice(0, 5)));
    conf('nenhum link para o site antigo', !r.antigo.length, JSON.stringify(r.antigo.slice(0, 5)));
    conf('nenhum botão "em construção" visível', !r.wip.length, JSON.stringify(r.wip));
    const fechada = ['/cadastro', '/entrar', '/equipe'].includes(p);
    conf(fechada ? 'página de conta: fora do Google (noindex)' : 'Google liberado (index)', fechada ? /noindex/.test(r.robots) : /(^|,\s*)index/.test(r.robots), r.robots);
    if (!fechada) conf('canônico no domínio de produção', r.canon.startsWith(DOMINIO), r.canon);
  }

  console.log('\n--- robots.txt ---');
  const robots = await (await fetch(BASE + '/robots.txt')).text();
  conf('robots.txt libera o site', /Allow: \//.test(robots) && !/Disallow: \/\s*$/m.test(robots), robots.slice(0, 120));
  conf('robots.txt aponta o sitemap do domínio', robots.includes(DOMINIO + '/sitemap.xml'), robots.slice(0, 200));
  const sm = await (await fetch(BASE + '/sitemap.xml')).text();
  conf('sitemap no domínio de produção, sem páginas de conta', sm.includes(DOMINIO) && !/cadastro|equipe|entrar|interno/.test(sm));

  console.log('\n' + (falhas ? 'FALHAS: ' + falhas + ' de ' + total : 'TUDO OK em ' + total + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(falhas ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
