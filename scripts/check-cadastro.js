/**
 * Verificação da página de inscrição (site/src/pages/cadastro.astro), num
 * Chrome de verdade, SEM tocar no Wix: as respostas de /api/clube/* são
 * simuladas aqui (Fetch.requestPaused). Testa a tela e as regras do navegador;
 * as regras do servidor são as mesmas (src/clube/regras.ts) e o servidor é
 * testado ao vivo à parte.
 *
 * Uso:  node scripts/check-cadastro.js [http://localhost:4321]
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const port = 9000 + Math.floor(Math.random() * 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target(){for(let i=0;i<60;i++){try{const l=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();const p=l.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl}catch(e){}await sleep(250)}throw new Error('sem chrome')}
function connect(u){return new Promise((res,rej)=>{const ws=new WebSocket(u);let id=0;const pend=new Map();const ouv=[];ws.addEventListener('open',()=>res({send(m,p){const i=++id;ws.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}))},on(f){ouv.push(f)},close(){ws.close()}}));ws.addEventListener('error',rej);ws.addEventListener('message',m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){const{a,b}=pend.get(d.id);pend.delete(d.id);d.error?b(new Error(d.error.message)):a(d.result)}else ouv.forEach(f=>f(d))})})}

let falhas = 0, total = 0;
const conf = (nome, obtido, esperado) => { total++; const ok = JSON.stringify(obtido) === JSON.stringify(esperado); if (!ok) falhas++; console.log((ok ? '  ok     ' : '  FALHA  ') + nome + (ok ? '' : '\n           esperava ' + JSON.stringify(esperado) + ', obtive ' + JSON.stringify(obtido))); };

// respostas simuladas do servidor, trocadas a cada cenário
let respostas = {};
const enviados = [];

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  const erros = [];
  cdp.on((d) => { if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/clube/*' }] });
  cdp.on(async (d) => {
    if (d.method !== 'Fetch.requestPaused') return;
    const rota = new URL(d.params.request.url).pathname.replace('/api/clube/', '');
    if (d.params.request.postData) { try { enviados.push({ rota, corpo: JSON.parse(d.params.request.postData) }); } catch { enviados.push({ rota, corpo: null }); } }
    else if (d.params.request.method === 'PUT') enviados.push({ rota, corpo: null });
    const [status, corpo] = respostas[rota] || [404, { erro: 'sem simulação' }];
    await cdp.send('Fetch.fulfillRequest', {
      requestId: d.params.requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify(corpo)).toString('base64'),
    });
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const js = async (code) => { const r = await cdp.send('Runtime.evaluate', { expression: '(async()=>{' + code + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const visivel = (id) => "!document.getElementById('" + id + "').hidden";
  const ir = async () => { await cdp.send('Page.navigate', { url: BASE + '/cadastro' }); for (let i = 0; i < 40; i++) { await sleep(250); const pronto = await js("return document.getElementById('cad-carregando') && document.getElementById('cad-carregando').hidden").catch(() => false); if (pronto) return; } };

  console.log('\n--- visitante ---');
  respostas = { painel: [401, { erros: { geral: 'Entre…' } }] };
  await ir();
  let r = await js("return {vis:" + visivel('cad-visitante') + ", form:" + visivel('cad-form') + ", href:document.querySelector('#cad-visitante a').getAttribute('href')}");
  conf('sem login pede para entrar', r.vis && !r.form, true);
  conf('e o login volta para a inscrição', /volta=%2Fcadastro/.test(r.href), true);

  console.log('\n--- prévia sem servidor ---');
  respostas = {};
  await ir();
  conf('sem servidor avisa que é prévia', await js('return ' + visivel('cad-previa')), true);

  const APELIDOS = [
    { apelido: 'Lucas', nome: 'Lucas de Teste', nascimento: '', local: '', fatos: '', proximo: 'Lucas' },
    { apelido: 'Faraday', nome: 'Michael Faraday', nascimento: '1791', local: 'Newington, Inglaterra', fatos: 'Estudou eletricidade e magnetismo.', proximo: 'Faraday001' },
  ];
  console.log('\n--- primeira inscrição ---');
  respostas = { painel: [200, { responsavel: null, criancas: [] }], apelidos: [200, { apelidos: APELIDOS }] };
  await ir();
  r = await js("return {form:" + visivel('cad-form') + ", resp:" + visivel('cad-resp') + ", avatares:document.querySelectorAll('.cad__avatares input').length, anos:document.querySelectorAll('#cad-ano option').length - 1, img:document.getElementById('cad-aut-img').checked, part:document.getElementById('cad-aut-part').checked}");
  conf('mostra o formulário com os dados do responsável', r.form && r.resp, true);
  conf('8 avatares para escolher', r.avatares, 8);
  conf('7 anos de nascimento (9 a 13 anos, com folga)', r.anos, 7);
  conf('nenhuma autorização vem marcada', [r.part, r.img], [false, false]);
  conf('não pede CPF, RG nem foto da criança', await js("return !document.querySelector('#cad-form [name^=\"crianca.\"][name*=\"cpf\"], #cad-form [name*=\"rg\"], #cad-form input[type=file]')"), true);

  r = await js("document.getElementById('cad-enviar').click(); await new Promise(r=>setTimeout(r,150)); return {msg:document.getElementById('cad-msg').textContent, erros:[...document.querySelectorAll('#cad-form .err:not([hidden])')].map(e=>e.id.replace('err-','')), foco:document.activeElement.name}");
  conf('enviar vazio é barrado', /Falta pouco/.test(r.msg), true);
  conf('aponta os 8 pendentes', r.erros.length, 8);
  conf('foco no primeiro (nome do responsável)', r.foco, 'responsavel.nome');
  conf('nada foi enviado ao servidor', enviados.length, 0);

  r = await js(`
    const f=document.getElementById('cad-form');
    const por=(n,v)=>{const e=f.querySelector('[name="'+n+'"]'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));};
    por('responsavel.nome','Ana Souza'); por('responsavel.cpf','11111111111'); por('crianca.relacao','mae');
    por('crianca.primeiroNome','Lucas'); por('crianca.anoNascimento', f.querySelector('#cad-ano').options[3].value);
    por('crianca.apelido','Lucas');
    f.querySelector('[name="crianca.avatar"][value=foguete]').click();
    document.getElementById('cad-aut-part').click();
    document.getElementById('cad-enviar').click(); await new Promise(r=>setTimeout(r,150));
    return {cpfMask:f.querySelector('[name="responsavel.cpf"]').value, erros:Object.fromEntries([...f.querySelectorAll('.err:not([hidden])')].map(e=>[e.id.replace('err-',''),e.textContent]))};`);
  conf('CPF ganha máscara', r.cpfMask, '111.111.111-11');
  conf('CPF inválido é recusado', !!r.erros['responsavel.cpf'], true);
  conf('apelido com o nome da criança é recusado', /nome da criança/.test(r.erros['crianca.apelido'] || ''), true);
  conf('só esses dois seguem marcados', Object.keys(r.erros).sort(), ['crianca.apelido', 'responsavel.cpf']);

  const PAINEL = { responsavel: { nome: 'Ana Souza' }, criancas: [{ id: '11111111-2222-3333-4444-555555555555', apelido: 'Faraday001', primeiroNome: 'Lucas', avatar: 'foguete', situacao: 'active', autorizacoes: { participacao: 'aceita', imagem: 'nao_dada' } }] };
  respostas.cadastro = [201, PAINEL];
  r = await js(`
    const f=document.getElementById('cad-form');
    const por=(n,v)=>{const e=f.querySelector('[name="'+n+'"]'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    por('responsavel.cpf','529.982.247-25'); por('crianca.apelido','Faraday');
    f.querySelector('#cad-apelido').dispatchEvent(new Event('change',{bubbles:true}));
    const quem = document.getElementById('cad-apelido-quem').textContent;
    document.getElementById('cad-enviar').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,150)); if(!document.getElementById('cad-painel').hidden) break; }
    return {painel:!document.getElementById('cad-painel').hidden, ola:document.getElementById('cad-ola').textContent, feito:document.getElementById('cad-feito').textContent,
            itens:document.querySelectorAll('.cad__crianca').length, retirar:document.querySelectorAll('[data-revogar]').length, quem};`);
  conf('o apelido vem da lista do clube', await js("return [...document.querySelectorAll('#cad-apelido option')].map(o=>o.value).filter(Boolean)"), ['Lucas', 'Faraday']);
  conf('mostra quem foi a pessoa e como o apelido vai ficar', /Michael Faraday[\s\S]*Faraday001/.test(r.quem), true);
  const envio = enviados.find((e) => e.rota === 'cadastro');
  conf('válido: vai ao servidor uma vez', enviados.filter((e) => e.rota === 'cadastro').length, 1);
  conf('o envio NÃO leva id de membro (o servidor lê da sessão)', JSON.stringify(envio?.corpo || {}).includes('memberId'), false);
  conf('o envio leva a versão dos termos', /^termos-/.test(envio?.corpo?.versaoTermos || ''), true);
  conf('autorização de imagem não marcada vai como false', envio?.corpo?.autorizacoes?.imagem, false);
  conf('depois do sucesso mostra o painel', r.painel, true);
  conf('cumprimenta pelo primeiro nome', r.ola, 'Olá, Ana. Seus membros pesquisadores');
  conf('confirma a inscrição pelo apelido que o servidor deu', r.feito, 'Faraday001 agora é membro pesquisador do clube!');
  conf('um botão "Retirar" por autorização dada', [r.itens, r.retirar], [1, 1]);

  console.log('\n--- erro do servidor ---');
  respostas = { painel: [200, PAINEL], apelidos: [200, { apelidos: APELIDOS }], cadastro: [409, { erros: { 'crianca.apelido': 'Escolha um nome da lista.' } }] };
  await ir();
  r = await js(`
    document.getElementById('cad-outra').click();
    const f=document.getElementById('cad-form');
    const por=(n,v)=>{const e=f.querySelector('[name="'+n+'"]'); e.value=v; e.dispatchEvent(new Event('change',{bubbles:true}));};
    for(let i=0;i<20 && f.querySelectorAll('#cad-apelido option').length<3;i++) await new Promise(r=>setTimeout(r,100));
    por('crianca.relacao','mae'); por('crianca.primeiroNome','Bia'); por('crianca.anoNascimento', f.querySelector('#cad-ano').options[2].value); por('crianca.apelido','Faraday');
    f.querySelector('[name="crianca.avatar"][value=folha]').click(); document.getElementById('cad-aut-part').click();
    document.getElementById('cad-enviar').click(); await new Promise(r=>setTimeout(r,500));
    return {resp:!document.getElementById('cad-resp').hidden, cancelar:!document.getElementById('cad-cancelar').hidden, err:document.getElementById('err-crianca.apelido').textContent};`);
  conf('"Inscrever outro filho" não pede o responsável de novo', r.resp, false);
  conf('e tem "Cancelar"', r.cancelar, true);
  conf('recusa do servidor: a mensagem aparece no campo do apelido', r.err, 'Escolha um nome da lista.');

  /* ---------- registrar atividade: campos, anexo, autorização de imagem ---------- */
  console.log('\n--- registrar atividade ---');
  const ID = '11111111-2222-3333-4444-555555555555';
  const PONTOS = { saldo: 0, extrato: [], registros: [], resgates: [] };
  const semImagem = { responsavel: { nome: 'Ana Souza' }, criancas: [{ ...PAINEL.criancas[0], pontos: PONTOS, sugestao: null }] };
  const comImagem = { responsavel: { nome: 'Ana Souza' }, criancas: [{ ...semImagem.criancas[0], autorizacoes: { participacao: 'aceita', imagem: 'aceita' } }] };
  respostas = { painel: [200, semImagem] };
  enviados.length = 0;
  await ir();
  const campos = (chave) => js(`
    const sel=document.getElementById('reg-atividade'); sel.value='${chave}'; sel.dispatchEvent(new Event('change',{bubbles:true}));
    const v=(id)=>!document.getElementById(id).hidden && !document.getElementById(id).closest('[hidden]');
    return {arquivo:v('reg-arquivo-campo'), link:v('reg-link-campo'), aviso:v('reg-aviso'), titulo:v('reg-titulo'), texto:v('reg-texto'), media:v('reg-media'),
            rotulo:document.getElementById('reg-arquivo-rotulo').textContent, rotuloLink:document.getElementById('reg-link-rotulo').textContent};`);
  await js("document.querySelector('[data-registrar]').click()");
  r = await js("return {foto:document.querySelector('#reg-atividade option[value=foto_autoral]').disabled, video:document.querySelector('#reg-atividade option[value=video_autoral]').disabled, texto:document.querySelector('#reg-atividade option[value=texto_autoral]').disabled, aviso:!document.getElementById('reg-sem-imagem').hidden}");
  conf('sem autorização de imagem: foto e vídeo bloqueados, texto liberado', [r.foto, r.video, r.texto], [true, true, false]);
  conf('e a tela explica por quê', r.aviso, true);
  r = await campos('media_bimestre');
  conf('média: pede o boletim (obrigatório), sem link nem aviso de imagem', [r.media, r.arquivo, /boletim/.test(r.rotulo) && /\*/.test(r.rotulo), r.link, r.aviso], [true, true, true, false, false]);
  r = await campos('link_artigo');
  conf('link de artigo: título e link obrigatório, sem arquivo', [r.titulo, r.link, /\*/.test(r.rotuloLink), r.arquivo], [true, true, true, false]);
  r = await campos('texto_autoral');
  conf('texto autoral: título, texto e arquivo opcional', [r.titulo, r.texto, r.arquivo, /\*/.test(r.rotulo)], [true, true, true, false]);
  r = await campos('palestra_online');
  conf('participação: link opcional, sem arquivo', [r.link, /opcional/.test(r.rotuloLink), r.arquivo], [true, true, false]);

  // média sem boletim: barrada no navegador
  r = await js(`
    const sel=document.getElementById('reg-atividade'); sel.value='media_bimestre'; sel.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('reg-bim').value='1'; document.getElementById('reg-media').value='9';
    document.getElementById('reg-enviar').click(); await new Promise(r=>setTimeout(r,200));
    return document.getElementById('err-registro.arquivo').hidden ? '' : document.getElementById('err-registro.arquivo').textContent;`);
  conf('média sem o boletim é barrada', /boletim/.test(r), true);
  conf('e nada vai ao servidor', enviados.length, 0);

  // com o boletim: pede o endereço, sobe o arquivo, registra com o id
  const arq = path.join(profile, 'boletim.jpg');
  fs.writeFileSync(arq, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]));
  const doc = await cdp.send('DOM.getDocument', {});
  const no = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#reg-arquivo' });
  await cdp.send('DOM.setFileInputFiles', { nodeId: no.nodeId, files: [arq] });
  respostas.anexo = [200, { uploadUrl: BASE + '/api/clube/__envio' }];
  respostas.__envio = [200, { file: { id: 'd49d42_teste1234~mv2.jpg' } }];
  respostas.registrar = [201, comImagem];
  r = await js(`
    document.getElementById('reg-enviar').click();
    for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,150)); if(!document.getElementById('cad-painel').hidden) break; }
    return {painel:!document.getElementById('cad-painel').hidden, feito:document.getElementById('cad-feito').textContent};`);
  const pedido = enviados.find((e) => e.rota === 'anexo'), registro = enviados.find((e) => e.rota === 'registrar');
  conf('pede o endereço de envio com tipo e tamanho do arquivo', [pedido?.corpo?.tipo, pedido?.corpo?.tamanho > 0, pedido?.corpo?.atividade], ['image/jpeg', true, 'media_bimestre']);
  conf('sobe o arquivo direto (PUT)', enviados.some((e) => e.rota === '__envio'), true);
  conf('o registro leva o id do arquivo, não o arquivo', registro?.corpo?.detalhe?.arquivo, 'd49d42_teste1234~mv2.jpg');
  conf('na ordem: endereço, envio, registro', enviados.map((e) => e.rota), ['anexo', '__envio', 'registrar']);
  conf('volta ao painel com a confirmação', r.painel && /Registro enviado/.test(r.feito), true);

  // autorizar a imagem depois, pelo painel
  console.log('\n--- autorizar imagem depois ---');
  respostas = { painel: [200, semImagem], autorizar: [200, comImagem] };
  enviados.length = 0;
  await ir();
  r = await js(`
    window.confirm = () => true;
    const b=document.querySelector('[data-autorizar]'); if(!b) return {botao:false};
    b.click(); for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(!document.querySelector('[data-autorizar]')) break; }
    document.querySelector('[data-registrar]').click();
    return {botao:true, foto:document.querySelector('#reg-atividade option[value=foto_autoral]').disabled};`);
  conf('"Autorizar" aparece quando a imagem não foi autorizada', r.botao, true);
  conf('o pedido leva a versão do texto', /^termos-/.test(enviados.find((e) => e.rota === 'autorizar')?.corpo?.versaoTermos || ''), true);
  conf('autorizada: foto liberada', r.foto, false);

  // sugerir apelido fora da lista
  console.log('\n--- sugerir apelido ---');
  const comSugestao = { responsavel: { nome: 'Ana Souza' }, criancas: [{ ...semImagem.criancas[0], sugestao: { situacao: 'pending', apelido: 'Kepler', nome: 'Johannes Kepler', observacao: '' } }] };
  respostas = { painel: [200, semImagem], 'sugerir-apelido': [201, comSugestao] };
  enviados.length = 0;
  await ir();
  r = await js(`
    document.querySelector('[data-sugerir]').click();
    const vis=!document.getElementById('cad-sug').hidden;
    document.getElementById('sug-enviar').click(); await new Promise(r=>setTimeout(r,150));
    return {vis, erros:[...document.querySelectorAll('#cad-sug .err:not([hidden])')].length};`);
  conf('abre o formulário de sugestão', r.vis, true);
  conf('vazio: aponta nome, apelido e pesquisa', r.erros, 3);
  r = await js(`
    const f=document.getElementById('cad-sug');
    const por=(n,v)=>{const e=f.querySelector('[name="'+n+'"]'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true}));};
    por('sugestao.nome','Johannes Kepler'); por('sugestao.apelido','Kepler');
    por('sugestao.pesquisa','Johannes Kepler nasceu em 1571, em Weil der Stadt, na Alemanha. Descobriu as leis do movimento dos planetas e dizia que estudar a natureza era pensar os pensamentos de Deus depois dele. Por isso ele combina com o tema das origens e com o clube.');
    const conta=document.getElementById('sug-conta').textContent;
    document.getElementById('sug-enviar').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,150)); if(!document.getElementById('cad-painel').hidden) break; }
    return {conta:Number(conta), painel:document.getElementById('cad-criancas').textContent};`);
  const sugEnvio = enviados.find((e) => e.rota === 'sugerir-apelido');
  conf('conta os caracteres da pesquisa', r.conta > 200, true);
  conf('envia nome, apelido e pesquisa da criança certa', [sugEnvio?.corpo?.researcherId, sugEnvio?.corpo?.apelido], [ID, 'Kepler']);
  conf('o painel mostra a sugestão esperando a equipe', /Kepler" esperando a equipe/.test(r.painel), true);

  conf('nenhum erro de JavaScript', erros, []);
  console.log('\n' + (falhas ? 'FALHAS: ' + falhas + ' de ' + total : 'TUDO OK em ' + total + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(falhas ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
