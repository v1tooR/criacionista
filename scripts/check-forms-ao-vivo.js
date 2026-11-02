/**
 * Teste AO VIVO dos formulários do Wix Forms, contra o `wix dev` (localhost:4321).
 *
 * Sem ENVIAR=1 só confere desenho, validação e regras — nada sai da máquina.
 * Com ENVIAR=1 manda UM envio de teste em cada formulário ("Teste do site (pode
 * apagar)", e-mails @exemplo.com) para o Wix do cliente — isso cria um envio e
 * um contato no painel, e inscreve teste-newsletter@exemplo.com na lista de
 * e-mail marketing. Conferir/limpar depois: node scripts/confere-envios.mjs (de site/).
 *
 * Uso:  node scripts/check-forms-ao-vivo.js [http://localhost:4321]
 *       ENVIAR=1 node scripts/check-forms-ao-vivo.js
 *       SO_NEWSLETTER=1 node scripts/check-forms-ao-vivo.js   (só a home: lançamento parcial)
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://localhost:4321';
const ENVIAR = process.env.ENVIAR === '1';
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map();const ouv=[];ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},on(f){ouv.push(f)},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}else ouv.forEach(f=>f(d))})})}
let falhas = 0, total = 0;
const conf = (nome, obtido, esperado) => { total++; const ok = JSON.stringify(obtido) === JSON.stringify(esperado); if (!ok) falhas++; console.log((ok ? '  ok     ' : '  FALHA  ') + nome + (ok ? '' : '\n           esperava ' + JSON.stringify(esperado) + ', obtive ' + JSON.stringify(obtido))); };
(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
  const erros = [];
  cdp.on((d) => { if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  const envios = [];
  cdp.on((d) => { if (d.method === 'Network.responseReceived' && /submissions/.test(d.params.response.url)) envios.push(d.params.response.status); });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const js = async (code) => { const r = await cdp.send('Runtime.evaluate', { expression: '(async()=>{' + code + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const ir = async (u) => { await cdp.send('Page.navigate', { url: u }); for (let i = 0; i < 60; i++) { await sleep(500); const ok = await js("return !!document.querySelector('[data-campos] .field')").catch(() => false); if (ok) return; } };

  let r;
  // SO_NEWSLETTER=1 pula o contato: no lançamento parcial (só a home) ele mostra "Em breve"
  if (process.env.SO_NEWSLETTER !== '1') {
  console.log('\n--- contato ---');
  await ir(BASE + '/contato');
  r = await js(`
    const f=document.querySelector('form[data-form-wix=contato]');
    return { rotulos:[...f.querySelectorAll('[data-campos] label, [data-campos] legend')].map(l=>l.textContent.replace(/\\s+/g,' ').trim()),
             opcoes:[...f.querySelectorAll('select option')].map(o=>o.textContent),
             botao:f.querySelector('button[type=submit]').textContent.trim(),
             caixa:!!f.querySelector('input[type=checkbox]'), link:f.querySelector('.check a')?.getAttribute('href') };`);
  conf('rótulos vindos do Wix', r.rotulos.slice(0, 4), ['Assunto *', 'Nome *', 'E-mail *', 'Mensagem *']);
  conf('assunto com placeholder + 7 opções', r.opcoes.length, 8);
  conf('botão com o texto do painel', r.botao, 'Enviar mensagem →');
  conf('caixa de autorização com link da política', [r.caixa, /politica-de-privacidade/.test(r.link || '')], [true, true]);

  r = await js(`
    const f=document.querySelector('form[data-form-wix=contato]');
    f.querySelector('button[type=submit]').click();
    await new Promise(r=>setTimeout(r,400));
    return { erros:[...f.querySelectorAll('.err:not([hidden])')].map(e=>e.textContent), status:f.querySelector('.nl__msg').textContent,
             marcados:f.querySelectorAll('.is-error').length, foco:document.activeElement?.tagName };`);
  conf('enviar vazio: 5 erros', r.erros.length, 5);
  conf('erros em português', r.erros.every((t) => !/^(Enter|Choose|Check)/.test(t)), true);
  console.log('           ' + JSON.stringify(r.erros));
  conf('resumo "Falta pouco"', /Falta pouco/.test(r.status), true);
  conf('foco no primeiro campo com erro', r.foco, 'SELECT');

  if (ENVIAR) {
    r = await js(`
      const f=document.querySelector('form[data-form-wix=contato]');
      const pega=(sel)=>f.querySelector(sel);
      const pôr=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
      const s=pega('select'); pôr(s, s.options[s.options.length-1].value);
      const txt=[...f.querySelectorAll('[data-campos] input[type=text]')]; pôr(txt[0],'Teste do site (pode apagar)');
      pôr(pega('input[type=email]'),'teste-formulario@exemplo.com');
      pôr(pega('textarea'),'Mensagem de teste enviada pela equipe de desenvolvimento do novo site. Pode apagar.');
      const c=pega('input[type=checkbox]'); c.click();
      pega('button[type=submit]').click();
      for(let i=0;i<40;i++){ await new Promise(r=>setTimeout(r,500)); if(f.querySelector('.nl__ok')) break; }
      return { ok:f.querySelector('.nl__ok')?.textContent.trim()||null, status:f.querySelector('.nl__msg')?.textContent };`);
    conf('envio real do contato: agradecimento do painel', r.ok, 'Mensagem enviada. Obrigado! Vamos responder no e-mail que você informou.');
    if (!r.ok) console.log('           status: ' + r.status);
  }
  }

  console.log('\n--- newsletter ---');
  await ir(BASE + '/');
  r = await js(`
    const f=document.querySelector('form[data-form-wix=newsletter]');
    const rot=()=>[...f.querySelectorAll('[data-campos] > .field > label, [data-campos] legend')].map(l=>l.textContent.replace(/\\s+/g,' ').trim());
    const antes=rot();
    const s=f.querySelector('select'); s.value='Outro'; s.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,200));
    const depois=rot();
    s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,200));
    return { antes, depois, volta:rot(), caixa:f.querySelector('input[type=checkbox]').checked };`);
  conf('newsletter sem o campo "Qual é a sua função?"', r.antes.includes('Qual é a sua função? *'), false);
  conf('regra do painel: "Outro" mostra e exige a função', r.depois.includes('Qual é a sua função? *'), true);
  conf('trocar de opção esconde de novo', r.volta.includes('Qual é a sua função? *'), false);
  conf('inscrição na newsletter nunca vem marcada', r.caixa, false);

  r = await js(`
    document.querySelector('[data-nl-view=cancelar]').click();
    await new Promise(r=>setTimeout(r,100));
    const c=document.getElementById('form-cancelar');
    return { aberto:!c.hidden, semCampo:!c.querySelector('input'), texto:c.querySelector('.nl__sub').textContent };`);
  conf('"Cancelar inscrição" explica o link do rodapé, sem campo de e-mail', [r.aberto, r.semCampo], [true, true]);
  await js("document.querySelector('[data-nl-view=inscrever]').click()");

  if (ENVIAR) {
    r = await js(`
      const f=document.querySelector('form[data-form-wix=newsletter]');
      const pôr=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
      const s=f.querySelector('select'); pôr(s,'Professor escolar');
      await new Promise(r=>setTimeout(r,100));
      pôr(f.querySelector('[data-campos] input[type=text]'),'Teste do site (pode apagar)');
      pôr(f.querySelector('input[type=email]'),'teste-newsletter@exemplo.com');
      f.querySelector('input[type=radio][value="Prefiro não informar"]').click();
      f.querySelector('input[type=checkbox]').click();
      f.querySelector('button[type=submit]').click();
      for(let i=0;i<40;i++){ await new Promise(r=>setTimeout(r,500)); if(f.querySelector('.nl__ok')) break; }
      return { ok:f.querySelector('.nl__ok')?.textContent.trim()||null, status:f.querySelector('.nl__msg')?.textContent };`);
    conf('envio real da newsletter: agradecimento do painel', /^Inscrição registrada/.test(r.ok || ''), true);
    if (!r.ok) console.log('           status: ' + r.status);
    console.log('  respostas HTTP de envio: ' + JSON.stringify(envios));
  }

  conf('nenhum erro de JavaScript', erros, []);
  console.log('\n' + (falhas ? 'FALHAS: ' + falhas + ' de ' + total : 'TUDO OK em ' + total + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(falhas ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
