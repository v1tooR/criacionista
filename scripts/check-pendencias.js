/**
 * Verificação da página interna de pendências (/interno/pendencias.html).
 *
 * Ela não passa pelo portador nem pelo diff-texto, e o que ela faz de útil
 * — guardar o rascunho e montar o texto de volta — só existe em JS. Então
 * a única forma de saber que continua funcionando é abrir num navegador.
 *
 * Uso:  node scripts/check-pendencias.js [http://localhost:4321]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = process.argv[2] || 'http://localhost:4321';
const URL_P = BASE + '/interno/pendencias.html';
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map(),once=new Map();ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},once(e){return new Promise(a=>once.set(e,a))},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}else if(d.method&&once.has(d.method)){once.get(d.method)(d.params);once.delete(d.method)}})})}

let ok = 0, mau = 0;
const conf = (nome, real, esp) => {
  const p = typeof esp === 'function' ? esp(real) : real === esp;
  console.log((p ? '  ok   ' : '  FALHA') + '  ' + nome + (p ? '' : '\n           obtive ' + JSON.stringify(real)));
  p ? ok++ : mau++;
};

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false });
  const ir = async () => { const l = cdp.once('Page.loadEventFired'); await cdp.send('Page.navigate', { url: URL_P }); await l; await sleep(700); };
  const js = async (ls) => {
    const r = await cdp.send('Runtime.evaluate', { expression: '(function(){' + ls.join('\n') + '})()', returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return JSON.parse(r.result.value);
  };

  await ir();
  let r = await js([
    "return JSON.stringify({campos:document.querySelectorAll('[data-q]').length,",
    "  blocos:document.querySelectorAll('.doc__grupo').length,",
    "  travam:document.querySelectorAll('.doc__cab .pill').length,",
    "  prog:document.getElementById('progTxt').textContent,",
    "  erros:0});",
  ]);
  conf('34 campos renderizados', r.campos, 34);
  conf('7 blocos', r.blocos, 7);
  conf('3 blocos marcados como travando', r.travam, 3);
  conf('contador começa zerado', r.prog, '0 de 34 respondidas');

  r = await js([
    "var p=function(id,v){var c=document.getElementById('c-'+id);c.value=v;",
    "  c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));};",
    "p('canal','WhatsApp'); p('canal_end','(11) 98888-7777'); p('pv_cnpj','12.345.678/0001-90');",
    "return JSON.stringify({prog:document.getElementById('progTxt').textContent,",
    "  marcadas:document.querySelectorAll('.box.respondida').length,",
    "  largura:document.getElementById('progFill').style.width});",
  ]);
  conf('contador sobe ao preencher', r.prog, '3 de 34 respondidas');
  conf('campos respondidos ficam marcados', r.marcadas, 3);
  conf('barra de progresso anda', r.largura !== '0%' && r.largura !== '', true);

  /* recarrega: o rascunho tem de sobreviver */
  await ir();
  r = await js([
    "return JSON.stringify({prog:document.getElementById('progTxt').textContent,",
    "  canal:document.getElementById('c-canal').value,",
    "  cnpj:document.getElementById('c-pv_cnpj').value});",
  ]);
  conf('rascunho sobrevive ao recarregar', r.prog, '3 de 34 respondidas');
  conf('o select volta escolhido', r.canal, 'WhatsApp');
  conf('o texto volta preenchido', r.cnpj, '12.345.678/0001-90');

  r = await js([
    "document.getElementById('btnGerar').click();",
    "var t=document.getElementById('texto').value;",
    "return JSON.stringify({escondido:document.getElementById('saida').hidden,",
    "  temCabecalho:t.indexOf('PENDÊNCIAS DO SITE')===0,",
    "  temResposta:t.indexOf('(11) 98888-7777')>-1,",
    "  temSecao:t.indexOf('## ATENDIMENTO')>-1,",
    "  listaFaltantes:/## AINDA SEM RESPOSTA \\(31\\)/.test(t),",
    "  semVazias:t.indexOf('## REDES SOCIAIS')===-1});",
  ]);
  conf('painel de saída aparece', r.escondido, false);
  conf('texto tem cabeçalho', r.temCabecalho, true);
  conf('texto traz a resposta digitada', r.temResposta, true);
  conf('texto agrupa por seção', r.temSecao, true);
  conf('lista as 31 que faltam', r.listaFaltantes, true);
  conf('omite seções sem nenhuma resposta', r.semVazias, true);

  /* limpar precisa de dois cliques */
  r = await js([
    "var b=document.getElementById('btnLimpar'); b.click();",
    "return JSON.stringify({rotulo:b.textContent, prog:document.getElementById('progTxt').textContent});",
  ]);
  conf('primeiro clique em Limpar só pede confirmação', r.prog, '3 de 34 respondidas');
  conf('e o botão avisa', r.rotulo, 'Apagar tudo?');

  r = await js([
    "document.getElementById('btnLimpar').click();",
    "return JSON.stringify({prog:document.getElementById('progTxt').textContent,",
    "  canal:document.getElementById('c-canal').value});",
  ]);
  conf('segundo clique apaga', r.prog, '0 de 34 respondidas');
  conf('e esvazia os campos', r.canal, '');

  /* largura de celular: nada pode estourar na horizontal */
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true });
  await ir();
  r = await js([
    "window.scrollTo(9999,0); var x=window.scrollX; window.scrollTo(0,0);",
    "return JSON.stringify({rolou:x, scrollW:document.documentElement.scrollWidth, tela:document.documentElement.clientWidth});",
  ]);
  conf('sem rolagem horizontal no celular', r.rolou, 0);

  console.log('\n' + (mau ? 'FALHAS: ' + mau + ' de ' + (ok + mau) : 'TUDO OK em ' + ok + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(mau ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
