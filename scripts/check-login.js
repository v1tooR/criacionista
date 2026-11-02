/**
 * Verificação da página de login e do estado de login no cabeçalho, num
 * Chrome de verdade, contra a build servida localmente (sem servidor do Wix).
 *
 * O que dá para provar sem conta real:
 *   - a tela: entrar ↔ criar conta, validação, "esqueci a senha";
 *   - a resposta honesta quando não há servidor (prévia estática do ZIP);
 *   - o cabeçalho trocando de estado pela dica do cookie — inclusive no menu
 *     do celular, onde `.mnav a{display:block}` vencia o atributo hidden;
 *   - o "Sair" montando o POST que a integração exige.
 * O login completo, com conta real, só roda com servidor (`wix dev`).
 *
 * Uso:  node scripts/check-login.js [http://localhost:4321]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map(),once=new Map();ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},once(e){return new Promise(a=>once.set(e,a))},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}else if(d.method&&once.has(d.method)){once.get(d.method)(d.params);once.delete(d.method)}})})}

let ok = 0, mau = 0;
const conf = (nome, real, esp) => {
  const p = typeof esp === 'function' ? esp(real) : real === esp;
  console.log((p ? '  ok   ' : '  FALHA') + '  ' + nome + (p ? '' : '\n           esperava ' + JSON.stringify(esp) + ', obtive ' + JSON.stringify(real)));
  p ? ok++ : mau++;
};

/* o cookie de sessão como a integração grava — só o papel importa para a dica */
const cookieMembro = encodeURIComponent(JSON.stringify({
  clientId: 'teste', tokens: { accessToken: { value: 'x', expiresAt: 0 }, refreshToken: { value: 'y', role: 'member' } },
}));

/* segura as chamadas ao Wix para sempre: a dica do cookie fica sendo o estado,
   em vez de ser corrigida pela resposta (que, com token falso, seria "não logado") */
const SEGURA_WIX = "(function(){var f=window.fetch;window.fetch=function(u){var s=String(u&&u.url||u);" +
  "if(/wixapis\\.com|wix\\.com/.test(s))return new Promise(function(){});return f.apply(this,arguments)};})();";

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable');
  const tela = (w, mobile) => cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile });
  const ir = async (u) => { const l = cdp.once('Page.loadEventFired'); await cdp.send('Page.navigate', { url: u }); await l; await sleep(900); };
  const js = async (linhas) => {
    const r = await cdp.send('Runtime.evaluate', { expression: '(async function(){' + linhas.join('\n') + '})()', returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return JSON.parse(r.result.value);
  };
  const POR = "var por=function(sel,v){var e=document.querySelector(sel);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));};";
  const VISIVEL = "var vis=function(el){return !!el && getComputedStyle(el).display!=='none' && !el.closest('[hidden]');};";

  await tela(1280, false);

  console.log('\n--- página de login ---');
  await ir(BASE + '/entrar.html?volta=%2Fconcurso.html');
  let r = await js([VISIVEL,
    "return JSON.stringify({titulo:document.getElementById('lg-titulo').textContent,",
    "  confirma:vis(document.getElementById('lg-confirma-w')), resp:vis(document.getElementById('lg-resp')),",
    "  esqueci:vis(document.getElementById('lg-esqueci-w')), voltar:document.getElementById('lg-voltar').getAttribute('href'),",
    "  robots:(document.querySelector('meta[name=robots]')||{}).content});"]);
  conf('abre no modo Entrar', r.titulo, 'Entrar');
  conf('sem campo de repetir senha', r.confirma, false);
  conf('sem aceite de responsável', r.resp, false);
  conf('com "esqueci minha senha"', r.esqueci, true);
  conf('guarda a volta pedida', r.voltar, '/concurso.html');
  conf('fora dos buscadores', r.robots, 'noindex, nofollow');

  r = await js(["document.getElementById('form-login').requestSubmit();",
    "return JSON.stringify({msg:document.getElementById('lg-msg').textContent, erros:document.querySelectorAll('#form-login .is-error').length});"]);
  conf('enviar vazio é barrado', r.msg.indexOf('Falta pouco') === 0, true);
  conf('marca e-mail e senha', r.erros, 2);

  r = await js([VISIVEL,
    "var c=document.querySelector('input[name=lg-modo][value=criar]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));",
    "return JSON.stringify({titulo:document.getElementById('lg-titulo').textContent, confirma:vis(document.getElementById('lg-confirma-w')),",
    "  resp:vis(document.getElementById('lg-resp')), esqueci:vis(document.getElementById('lg-esqueci-w')),",
    "  botao:document.getElementById('lg-enviar').textContent.trim(), autocompl:document.getElementById('lg-senha').autocomplete});"]);
  conf('"Criar conta" troca o título', r.titulo, 'Criar conta de responsável');
  conf('mostra repetir senha', r.confirma, true);
  conf('mostra o aceite de responsável', r.resp, true);
  conf('esconde "esqueci minha senha"', r.esqueci, false);
  conf('o botão vira "Criar conta"', r.botao.indexOf('Criar conta') === 0, true);
  conf('senha nova para o gerenciador de senhas', r.autocompl, 'new-password');

  r = await js([POR, "por('#lg-email','ana@exemplo.com');por('#lg-senha','abc12345');por('#lg-confirma','outra');",
    "document.getElementById('form-login').requestSubmit();",
    "return JSON.stringify({msg:document.getElementById('lg-msg').textContent});"]);
  conf('senhas diferentes são recusadas', r.msg.indexOf('as duas senhas não são iguais') > -1, true);
  conf('cadastro sem o aceite é recusado', r.msg.indexOf('confirme que você é o responsável') > -1, true);

  /* caixa do reCAPTCHA carregada e não marcada: o envio tem de parar aqui.
     Depende de alcançar o Google — sem internet, o caso é pulado, não falha. */
  r = await js([POR, "var c=document.querySelector('input[name=lg-modo][value=entrar]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));",
    "for(var i=0;i<30&&!document.querySelector('#lg-captcha iframe');i++)await new Promise(function(r){setTimeout(r,300)});",
    "if(!document.querySelector('#lg-captcha iframe'))return JSON.stringify({pulado:true});",
    "por('#lg-email','ana@exemplo.com');por('#lg-senha','abc12345');",
    "document.getElementById('form-login').requestSubmit();",
    "return JSON.stringify({msg:document.getElementById('lg-msg').textContent});"]);
  if (r.pulado) console.log('  --     caixa do reCAPTCHA não carregou (sem acesso ao Google): caso pulado');
  else conf('com a caixa carregada, exige marcar "Não sou um robô"', r.msg.indexOf('Marque a caixa') > -1, true);

  /* Google bloqueado: o formulário segue sem token e, sem servidor, a página
     tem de dizer que ali não há login. (Chrome automatizado também levaria
     desafio do reCAPTCHA se a caixa fosse clicada.) */
  await cdp.send('Network.setBlockedURLs', { urls: ['*google.com/recaptcha*', '*gstatic.com/recaptcha*'] });
  await ir(BASE + '/entrar.html?volta=%2Fconcurso.html');
  r = await js([POR, "var c=document.querySelector('input[name=lg-modo][value=entrar]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));",
    "por('#lg-email','ana@exemplo.com');por('#lg-senha','abc12345');",
    "document.getElementById('form-login').requestSubmit();",
    "for(var i=0;i<40;i++){var t=document.getElementById('lg-msg').textContent;if(t&&t!=='Entrando…')break;await new Promise(function(r){setTimeout(r,150)});}",
    "return JSON.stringify({msg:document.getElementById('lg-msg').textContent, botao:document.getElementById('lg-enviar').disabled});"]);
  conf('sem servidor, diz que a prévia não faz login', r.msg.indexOf('Nesta prévia o login não funciona') > -1, true);
  conf('e devolve o botão', r.botao, false);

  r = await js([VISIVEL, "document.getElementById('lg-esqueci').click();",
    "return JSON.stringify({rec:vis(document.getElementById('form-recuperar')), principal:vis(document.getElementById('lg-principal')),",
    "  email:document.getElementById('lg-rec-email').value});"]);
  conf('"esqueci" abre a recuperação', r.rec, true);
  conf('e esconde o login', r.principal, false);
  conf('já com o e-mail digitado', r.email, 'ana@exemplo.com');

  console.log('\n--- cabeçalho: visitante ---');
  await ir(BASE + '/');
  r = await js([VISIVEL,
    "var e=document.querySelector('.hdr__cta [data-sessao=visitante]'), o=document.querySelector('.hdr__cta [data-sessao-ola]'), s=document.querySelector('.hdr__cta [data-sair]');",
    "return JSON.stringify({entrar:vis(e), ola:vis(o), sair:vis(s), href:e.getAttribute('href')});"]);
  conf('mostra Entrar', r.entrar, true);
  conf('esconde Olá', r.ola, false);
  conf('esconde Sair', r.sair, false);
  conf('Entrar leva ao login com volta', r.href, '/entrar.html?volta=%2F');

  console.log('\n--- cabeçalho: cookie diz que é membro ---');
  await cdp.send('Network.setCookie', { name: 'wixSession', value: cookieMembro, url: BASE + '/', path: '/' });
  const seg = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEGURA_WIX });
  await ir(BASE + '/');
  r = await js([VISIVEL,
    "var e=document.querySelector('.hdr__cta [data-sessao=visitante]'), o=document.querySelector('.hdr__cta [data-sessao-ola]'), s=document.querySelector('.hdr__cta [data-sair]');",
    "return JSON.stringify({entrar:vis(e), ola:vis(o), sair:vis(s), olaTxt:o.textContent});"]);
  conf('esconde Entrar', r.entrar, false);
  conf('em 1280px o Olá some (só cabe o Sair)', r.ola, false);
  conf('mostra Sair', r.sair, true);
  conf('sem nome ainda, só "Olá"', r.olaTxt, 'Olá');

  // nome comprido (o Wix usa o começo do e-mail quando não há nome): o botão
  // Inscrever não pode sair da tela em nenhuma largura de desktop
  const CABE = [VISIVEL,
    "document.querySelectorAll('[data-sessao-ola]').forEach(function(el){el.textContent='Olá, victorssantos572'});",
    "var b=document.querySelector('.hdr__cta .btn:last-child'), o=document.querySelector('.hdr__cta [data-sessao-ola]');",
    "return JSON.stringify({dentro: b.getBoundingClientRect().right <= innerWidth, ola: vis(o)});"];
  for (const w of [1101, 1280, 1366, 1401, 1440]) {
    await tela(w, false);
    r = await js(CABE);
    conf('nome longo em ' + w + 'px: Inscrever dentro da tela', r.dentro, true);
    if (w >= 1401) conf('em ' + w + 'px o Olá aparece', r.ola, true);
  }
  await tela(1280, false);

  await tela(400, true);
  await ir(BASE + '/');
  r = await js([VISIVEL,
    "document.getElementById('burger').click(); await new Promise(function(r){setTimeout(r,300)});",
    "var e=document.querySelector('.mnav [data-sessao=visitante]'), s=document.querySelector('.mnav [data-sair]');",
    "return JSON.stringify({entrar:vis(e), sair:vis(s), sairTxt:s.textContent});"]);
  conf('celular: esconde "Entrar / Cadastrar"', r.entrar, false);
  conf('celular: mostra só "Sair"', r.sair, true);

  r = await js([
    "var alvo=null; HTMLFormElement.prototype.submit=function(){alvo={metodo:this.method, acao:this.getAttribute('action')}};",
    "document.querySelector('.mnav [data-sair]').click(); await new Promise(function(r){setTimeout(r,200)});",
    "return JSON.stringify(alvo||{});"]);
  conf('Sair envia POST', r.metodo, 'post');
  conf('para a saída da integração, voltando à página', r.acao, '/api/auth/logout?returnToUrl=%2F');

  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seg.identifier });

  console.log('\n' + (mau ? 'FALHAS: ' + mau + ' de ' + (ok + mau) : 'TUDO OK em ' + ok + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(mau ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
