/**
 * Verificação dos formulários de contato, newsletter e doação, num Chrome de verdade.
 *
 * Os dois têm `novalidate`, então a checagem do navegador está desligada e a
 * validação em JS é a única que existe — se ela quebrar, o formulário passa a
 * aceitar qualquer coisa em silêncio. Nenhum dos outros verificadores pega
 * isso: o check.js olha layout e o diff-texto.js olha texto, e ambos veem a
 * página parada. Daí este.
 *
 * Uso:  node scripts/check-forms.js [http://localhost:4321]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const BASE = process.argv[2] || 'http://localhost:4321';
const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));
if (!chrome) { console.error('Chrome não encontrado.'); process.exit(1); }

const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map(),once=new Map();ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},once(e){return new Promise(a=>once.set(e,a))},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}else if(d.method&&once.has(d.method)){once.get(d.method)(d.params);once.delete(d.method)}})})}

let ok = 0, mau = 0;
const conf = (nome, real, esperado) => {
  const passou = typeof esperado === 'function' ? esperado(real) : real === esperado;
  console.log((passou ? '  ok   ' : '  FALHA') + '  ' + nome +
    (passou ? '' : '\n           esperava ' + JSON.stringify(esperado) + ', obtive ' + JSON.stringify(real)));
  passou ? ok++ : mau++;
};

/* preencher por .value não dispara evento, e é o evento que limpa o erro do
   campo — então o teste digita como gente, senão mede algo que não acontece */
const PREENCHE = "var por=function(sel,v){var e=document.querySelector(sel);e.value=v;" +
  "e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};";

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  const ir = async (u) => { const l = cdp.once('Page.loadEventFired'); await cdp.send('Page.navigate', { url: u }); await l; await sleep(700); };
  const js = async (linhas) => {
    const r = await cdp.send('Runtime.evaluate', { expression: '(function(){' + PREENCHE + linhas.join('\n') + '})()', returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return JSON.parse(r.result.value);
  };

  /*
   * Contato e newsletter são do Wix Forms (site/src/formulario-wix.ts): os
   * campos saem do esquema embutido na build, então aparecem mesmo sem rede.
   * Aqui o Wix fica BLOQUEADO — nada é enviado de verdade. O envio real é
   * conferido por scripts/check-forms-ao-vivo.js, contra o wix dev.
   * Os campos são achados pelo tipo de controle, nunca pelo nome: o nome
   * (target) é do Wix e muda se o dono recriar o campo.
   */
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*wixapis.com*', '*.wix.com*', '*/_wix/*', '*/_api/*'] });
  const espera = (ms) => sleep(ms);

  console.log('\n--- contato (Wix Forms): validação ---');
  await ir(BASE + '/contato.html');
  let r = await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "return JSON.stringify({campos:f.querySelectorAll('[data-campos] > .field').length,",
    "  rotulos:[].map.call(f.querySelectorAll('[data-campos] > .field > label'),function(l){return l.textContent.replace(/\\s+/g,' ').trim()})});",
  ]);
  conf('5 campos desenhados do esquema, sem rede', r.campos, 5);
  conf('rótulos do painel com o * de obrigatório', r.rotulos.slice(0, 4).join(' | '), 'Assunto * | Nome * | E-mail * | Mensagem *');

  r = await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "f.querySelector('button[type=submit]').click();",
    "return JSON.stringify({msg:f.querySelector('.nl__msg').textContent,",
    "  erros:[].map.call(f.querySelectorAll('.err:not([hidden])'),function(e){return e.textContent}),",
    "  marcados:f.querySelectorAll('.is-error').length, foco:document.activeElement.tagName});",
  ]);
  await espera(200);
  r = Object.assign(r, await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "return JSON.stringify({msg:f.querySelector('.nl__msg').textContent,",
    "  erros:[].map.call(f.querySelectorAll('.err:not([hidden])'),function(e){return e.textContent}),",
    "  marcados:f.querySelectorAll('.is-error').length, foco:document.activeElement.tagName});",
  ]));
  conf('submit vazio é barrado', r.msg.indexOf('Falta pouco') === 0, true);
  conf('aponta os 5 campos pendentes', r.marcados, 5);
  conf('mensagens em português', r.erros.length === 5 && r.erros.every(function (t) { return !/^(Enter|Choose|Check)\b/.test(t); }), true);
  conf('devolve o foco ao primeiro pendente (o assunto)', r.foco, 'SELECT');

  r = await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "var s=f.querySelector('select'); s.value=s.options[5].value; s.dispatchEvent(new Event('change',{bubbles:true}));",
    "var t=f.querySelector('[data-campos] input[type=text]'); t.value='Maria Silva'; t.dispatchEvent(new Event('input',{bubbles:true}));",
    "var e=f.querySelector('input[type=email]'); e.value='maria-sem-arroba'; e.dispatchEvent(new Event('input',{bubbles:true}));",
    "var m=f.querySelector('textarea'); m.value='Gostaria de propor uma parceria com o clube.'; m.dispatchEvent(new Event('input',{bubbles:true}));",
    "f.querySelector('input[type=checkbox]').click();",
    "f.querySelector('button[type=submit]').click();",
    "return '{}';",
  ]);
  await espera(300);
  r = await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "return JSON.stringify({erros:[].map.call(f.querySelectorAll('.err:not([hidden])'),function(e){return e.textContent}), marcados:f.querySelectorAll('.is-error').length});",
  ]);
  conf('e-mail inválido é recusado', (r.erros[0] || '').indexOf('e-mail válido') > -1, true);
  conf('só o e-mail segue marcado', r.marcados, 1);

  await js([
    "var f=document.querySelector('form[data-form-wix=contato]');",
    "var e=f.querySelector('input[type=email]'); e.value='maria@exemplo.com'; e.dispatchEvent(new Event('input',{bubbles:true}));",
    "f.querySelector('button[type=submit]').click();",
    "return '{}';",
  ]);
  let falha = {};
  for (let i = 0; i < 30; i++) {
    await espera(300);
    falha = await js([
      "var f=document.querySelector('form[data-form-wix=contato]');",
      "return JSON.stringify({msg:f.querySelector('.nl__msg').textContent, ok:!!f.querySelector('.nl__ok'), botao:f.querySelector('button[type=submit]').disabled});",
    ]);
    if (falha.msg && falha.msg !== 'Enviando…') break;
  }
  conf('sem o Wix, o envio falha com aviso em português', falha.msg, 'Não foi possível enviar agora. Tente de novo em instantes.');
  conf('e não finge que enviou', falha.ok, false);
  conf('e o botão volta a funcionar', falha.botao, false);

  console.log('\n--- newsletter (Wix Forms): regra e inscrição ---');
  await ir(BASE + '/');
  r = await js([
    "var f=document.querySelector('form[data-form-wix=newsletter]');",
    "var n=function(){return f.querySelectorAll('[data-campos] > .field, [data-campos] > fieldset').length};",
    "var antes=n(); var s=f.querySelector('select'); s.value='Outro'; s.dispatchEvent(new Event('change',{bubbles:true}));",
    "var depois=n(); var extra=f.querySelector('[data-campos] > .field:nth-child(2) label').textContent.replace(/\\s+/g,' ').trim();",
    "s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true}));",
    "return JSON.stringify({antes:antes, depois:depois, volta:n(), extra:extra, caixa:f.querySelector('input[type=checkbox]').checked,",
    "  genero:f.querySelectorAll('.radios input[type=radio]').length});",
  ]);
  conf('"Outro" faz aparecer um campo (regra do painel)', r.depois, r.antes + 1);
  conf('o campo que aparece é obrigatório', r.extra, 'Qual é a sua função? *');
  conf('trocar de opção tira o campo de novo', r.volta, r.antes);
  conf('autorização de envio começa desmarcada', r.caixa, false);
  conf('gênero com as 3 opções', r.genero, 3);

  r = await js([
    "document.querySelector('[data-nl-view=cancelar]').click();",
    "var c=document.getElementById('form-cancelar');",
    "return JSON.stringify({aberto:!c.hidden, campo:!!c.querySelector('input'), form:document.getElementById('form-educadores').hidden});",
  ]);
  conf('"Cancelar inscrição" abre a explicação', r.aberto && r.form, true);
  conf('sem campo de e-mail (ninguém tira o e-mail de outra pessoa)', r.campo, false);
  await cdp.send('Network.setBlockedURLs', { urls: [] });

  console.log('\n--- doação: resumo e regra do cartão ---');
  await ir(BASE + '/doe.html');
  r = await js(["return JSON.stringify({resumo:document.getElementById('d-resumo').textContent});"]);
  conf('estado inicial', r.resumo, 'R$ 50 uma vez');

  r = await js([
    "document.querySelector('.doe__val[data-v=\"100\"]').click();",
    "return JSON.stringify({resumo:document.getElementById('d-resumo').textContent});",
  ]);
  conf('escolher R$ 100 atualiza o botão', r.resumo, 'R$ 100 uma vez');

  r = await js([
    "var m=document.querySelector('input[name=freq][value=mensal]');",
    "m.checked=true; m.dispatchEvent(new Event('change',{bubbles:true}));",
    "var s=document.getElementById('d-pag');",
    "return JSON.stringify({resumo:document.getElementById('d-resumo').textContent,",
    "  pix:s.querySelector('option[value=pix]').disabled,",
    "  boleto:s.querySelector('option[value=boleto]').disabled,",
    "  cartao:s.querySelector('option[value=cartao]').disabled,",
    "  rotulo:s.querySelector('option[value=pix]').textContent,",
    "  aviso:!document.getElementById('d-pag-err').hidden});",
  ]);
  conf('"Todo mês" atualiza o botão', r.resumo, 'R$ 100 por mês');
  conf('mensal desliga Pix', r.pix, true);
  conf('mensal desliga boleto', r.boleto, true);
  conf('mensal mantém cartão', r.cartao, false);
  conf('mensal explica por que Pix saiu', r.rotulo.indexOf('indisponível') > -1, true);
  conf('mensal mostra o aviso do cartão', r.aviso, true);

  r = await js([
    "por('#d-outro','75');",
    "return JSON.stringify({resumo:document.getElementById('d-resumo').textContent,",
    "  fixos:document.querySelectorAll('.doe__val.is-on').length});",
  ]);
  conf('valor livre assume o resumo', r.resumo, 'R$ 75 por mês');
  conf('valor livre desmarca os fixos', r.fixos, 0);

  r = await js([
    "var m=document.querySelector('input[name=freq][value=unica]');",
    "m.checked=true; m.dispatchEvent(new Event('change',{bubbles:true}));",
    "var s=document.getElementById('d-pag');",
    "return JSON.stringify({pix:s.querySelector('option[value=pix]').disabled,",
    "  rotulo:s.querySelector('option[value=pix]').textContent,",
    "  aviso:!document.getElementById('d-pag-err').hidden});",
  ]);
  conf('voltar para única religa o Pix', r.pix, false);
  conf('e devolve o rótulo original', r.rotulo, 'Pix');
  conf('e esconde o aviso do cartão', r.aviso, false);

  console.log('\n--- doação: validação ---');
  await ir(BASE + '/doe.html');
  r = await js([
    "var f=document.getElementById('form-doacao');",
    "f.querySelector('button[type=submit]').click();",
    "return JSON.stringify({msg:f.querySelector('.nl__msg').textContent});",
  ]);
  conf('submit vazio é barrado', r.msg.indexOf('Falta pouco') === 0, true);
  conf('não reclama do valor (R$ 50 já vem escolhido)', r.msg.indexOf('valor') === -1, true);

  r = await js([
    "por('#d-outro','2');",
    "var f=document.getElementById('form-doacao');",
    "f.querySelector('button[type=submit]').click();",
    "return JSON.stringify({msg:f.querySelector('.nl__msg').textContent});",
  ]);
  conf('valor abaixo do mínimo é recusado', r.msg.indexOf('R$ 5 ou mais') > -1, true);

  r = await js([
    "por('#d-outro','80'); por('#d-nome','João Pereira'); por('#d-email','joao@exemplo.com');",
    "por('#d-pag','cartao');",
    "var c=document.querySelector('#d-consent input'); c.checked=true;",
    "c.dispatchEvent(new Event('change',{bubbles:true}));",
    "var f=document.getElementById('form-doacao');",
    "f.querySelector('button[type=submit]').click();",
    "return JSON.stringify({ok:!!f.querySelector('.nl__ok'),",
    "  texto:(f.querySelector('.nl__ok')||{}).textContent||''});",
  ]);
  conf('doação completa conclui', r.ok, true);
  conf('o resumo final traz o valor', r.texto.indexOf('80') > -1, true);
  conf('e avisa que nada foi cobrado', r.texto.toLowerCase().indexOf('prévia') > -1, true);

  console.log('\n' + (mau ? 'FALHAS: ' + mau + ' de ' + (ok + mau) : 'TUDO OK em ' + ok + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(mau ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
