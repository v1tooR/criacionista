/**
 * Verificação do painel da equipe (/equipe) e do registro de atividade no
 * painel do responsável (/cadastro), num Chrome de verdade, SEM tocar no Wix:
 * as respostas de /api/* são simuladas aqui.
 *
 * Uso:  node scripts/check-equipe.js [http://localhost:4321]
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

let respostas = {};
const enviados = [];
const ID = '11111111-2222-3333-4444-555555555555';
const PONTOS = { saldo: 25, extrato: [{ data: '2026-10-20T12:00:00.000Z', descricao: 'Oficina — Fósseis (18/10/2026)', pontos: 15 }, { data: '2026-10-10T12:00:00.000Z', descricao: 'Média do 3º bimestre de 2026: 8,5', pontos: 10 }],
  registros: [{ id: 'r1', atividade: 'Exposição', resumo: 'Museu (01/10/2026)', situacao: 'rejected', pontos: null, observacao: 'Faltou a data certa.', data: '2026-10-02T12:00:00.000Z' }] };
const PAINEL = { responsavel: { nome: 'Ana Souza' }, equipe: false, criancas: [{ id: ID, apelido: 'Faraday 07', primeiroNome: 'Lucas', avatar: 'foguete', situacao: 'active', autorizacoes: { participacao: 'aceita', imagem: 'nao_dada' }, pontos: PONTOS }] };
const FILA = [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', apelido: 'Faraday 07', avatar: 'foguete', area: 'Participação em atividades', atividade: 'Oficina', pontos: 15, resumo: 'Fósseis (18/10/2026)', link: '', texto: '', anexo: '', data: '2026-10-20T12:00:00.000Z' }];
const FILA_BOLETIM = [{ ...FILA[0], id: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee', area: 'Desempenho acadêmico', atividade: 'Média do bimestre igual ou maior que 8,0', pontos: 10, resumo: 'Média do 3º bimestre de 2026: 8,5', anexo: 'boletim' }];
const SUGESTOES = [{ id: 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee', apelidoAtual: 'Faraday 07', avatar: 'foguete', nome: 'Johannes Kepler', apelido: 'Kepler', pesquisa: 'Kepler descobriu as leis dos planetas.', data: '2026-10-25T12:00:00.000Z' }];

(async () => {
  const cdp = await connect(await target());
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  const erros = [];
  cdp.on((d) => { if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/api/clube/*' }, { urlPattern: '*/api/equipe/*' }] });
  cdp.on(async (d) => {
    if (d.method !== 'Fetch.requestPaused') return;
    const rota = new URL(d.params.request.url).pathname.replace('/api/', '');
    if (d.params.request.postData) enviados.push({ rota, corpo: JSON.parse(d.params.request.postData) });
    const [status, corpo] = respostas[rota] || [404, { erro: 'sem simulação' }];
    await cdp.send('Fetch.fulfillRequest', { requestId: d.params.requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(corpo)).toString('base64') });
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const js = async (code) => { const r = await cdp.send('Runtime.evaluate', { expression: '(async()=>{' + code + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const ir = async (rota, carregando) => { await cdp.send('Page.navigate', { url: BASE + rota }); for (let i = 0; i < 40; i++) { await sleep(250); if (await js("return !!document.getElementById('" + carregando + "') && document.getElementById('" + carregando + "').hidden").catch(() => false)) return; } };

  console.log('\n--- painel do responsável: pontos ---');
  respostas = { 'clube/painel': [200, PAINEL] };
  await ir('/cadastro', 'cad-carregando');
  let r = await js("return {saldo:document.querySelector('.cad__saldo')?.textContent, hist:document.querySelectorAll('.cad__hist').length, recusa:document.querySelector('.cad__hist')?.textContent.includes('Faltou a data certa.'), botao:!!document.querySelector('[data-registrar]'), equipe:!document.getElementById('cad-equipe').hidden}");
  conf('mostra o saldo', r.saldo, '25 pontos');
  conf('mostra registros e extrato', r.hist, 2);
  conf('recusa mostra o motivo da equipe', r.recusa, true);
  conf('botão "Registrar atividade"', r.botao, true);
  conf('quem não é da equipe não vê o atalho', r.equipe, false);

  r = await js(`document.querySelector('[data-registrar]').click(); await new Promise(r=>setTimeout(r,100));
    const s=document.getElementById('reg-atividade');
    return {form:!document.getElementById('cad-reg').hidden, titulo:document.getElementById('cad-reg-titulo').textContent,
      producaoTextoELink:['texto_autoral','link_postagem','link_artigo','link_video'].every(v=>!s.querySelector('option[value='+v+']').disabled),
      semPresencial:![...s.options].some(o=>o.value==='palestra_presencial')}`);
  conf('abre o registro para a criança certa', [r.form, r.titulo], [true, 'Registrar atividade de Faraday 07']);
  conf('produção científica liberada (texto e links)', r.producaoTextoELink, true);
  conf('palestra presencial não aparece (a equipe lança)', r.semPresencial, true);

  r = await js(`const s=document.getElementById('reg-atividade'); s.value='media_bimestre'; s.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,50));
    const visiveis=[...document.querySelectorAll('#cad-reg div[data-area]')].filter(e=>!e.hidden).map(e=>e.dataset.area);
    document.getElementById('reg-bim').value='3'; document.getElementById('reg-media').value='7,5';
    document.getElementById('reg-enviar').click(); await new Promise(r=>setTimeout(r,150));
    return {visiveis, bim:!document.querySelector('[data-so=media_bimestre]').hidden, erro:document.getElementById('err-registro.media').textContent,
      opcoes:[...s.options].filter(o=>o.hidden).length}`);
  conf('desempenho mostra só os campos de média', r.visiveis, ['desempenho']);
  conf('escolher uma atividade não esconde as outras opções da lista', r.opcoes, 0);
  conf('e o campo do bimestre', r.bim, true);
  conf('média abaixo de 8,0 é recusada antes de enviar', r.erro, 'Os pontos valem para média 8,0 ou maior.');
  conf('nada foi enviado', enviados.length, 0);

  respostas['clube/registrar'] = [201, PAINEL];
  r = await js(`const s=document.getElementById('reg-atividade'); s.value='oficina'; s.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('reg-evento').value='Oficina de fósseis'; document.getElementById('reg-data').value='2026-10-18';
    document.getElementById('reg-enviar').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,150)); if(!document.getElementById('cad-painel').hidden) break; }
    return {painel:!document.getElementById('cad-painel').hidden, feito:document.getElementById('cad-feito').textContent}`);
  const env = enviados.find((e) => e.rota === 'clube/registrar');
  conf('envia atividade, criança e detalhe', env && [env.corpo.atividade, env.corpo.researcherId, env.corpo.detalhe.evento, env.corpo.detalhe.data], ['oficina', ID, 'Oficina de fósseis', '2026-10-18']);
  conf('o navegador NÃO manda quantos pontos vale', JSON.stringify(env?.corpo || {}).includes('pontos'), false);
  conf('volta ao painel com aviso', [r.painel, r.feito], [true, 'Registro enviado. A equipe confere e os pontos entram no extrato.']);

  console.log('\n--- painel da equipe ---');
  respostas = { 'equipe/fila': [403, { erros: { geral: 'Esta área é só da equipe do clube.' } }] };
  await ir('/equipe', 'eq-carregando');
  r = await js("return {fora:!document.getElementById('eq-fora').hidden, painel:!document.getElementById('eq-painel').hidden, titulo:document.getElementById('eq-fora-titulo').textContent}");
  conf('quem não é da equipe não vê a fila', [r.fora, r.painel, r.titulo], [true, false, 'Área da equipe']);

  respostas = { 'equipe/fila': [200, { fila: FILA }], 'equipe/decidir': [200, { fila: [] }], 'equipe/lancar': [201, { apelido: 'Faraday 07', pontos: 20 }] };
  await ir('/equipe', 'eq-carregando');
  r = await js("return {itens:document.querySelectorAll('.eq__item').length, total:document.getElementById('eq-total').textContent, texto:document.querySelector('.eq__item').textContent}");
  conf('mostra a fila', [r.itens, r.total], [1, '1']);
  conf('a equipe vê só o apelido (sem nome real)', r.texto.includes('Faraday 07') && !r.texto.includes('Lucas'), true);

  enviados.length = 0;
  r = await js(`document.querySelector('[data-recusar]').click(); await new Promise(r=>setTimeout(r,100)); return document.getElementById('eq-msg').textContent`);
  conf('recusar sem motivo é barrado', /escreva o motivo/.test(r), true);
  conf('e nada é enviado', enviados.length, 0);
  r = await js(`document.querySelector('[data-aprovar]').click(); for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(!document.querySelector('.eq__item')) break; } return {msg:document.getElementById('eq-msg').textContent, vazio:document.querySelector('.eq__vazio')?.textContent}`);
  conf('aprovar manda id e decisão', enviados[0]?.corpo && [enviados[0].corpo.id, enviados[0].corpo.decisao], [FILA[0].id, 'aprovar']);
  conf('depois de aprovar a fila esvazia', [r.msg, r.vazio], ['Aprovado: os pontos entraram no extrato.', 'Nada esperando conferência.']);

  r = await js(`const f=document.getElementById('eq-lancar'); f.querySelector('[name="lancar.apelido"]').value='Faraday 07';
    f.querySelector('[name="registro.evento"]').value='Palestra sobre fósseis'; f.querySelector('[name="registro.data"]').value='2026-10-18';
    document.getElementById('eq-lancar-btn').click(); for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(document.getElementById('eq-lancar-msg').textContent) break; }
    return {msg:document.getElementById('eq-lancar-msg').textContent, opcoes:[...document.getElementById('eq-atividade').options].map(o=>o.value)}`);
  conf('lançar presença confirma os pontos', r.msg, '+20 pontos para Faraday 07.');
  conf('a equipe só lança participação (não média nem produção)', r.opcoes.every((v) => ['palestra_presencial', 'palestra_online', 'exposicao', 'oficina', 'curso'].includes(v)), true);

  console.log('\n--- anexo e sugestões de apelido (equipe) ---');
  respostas = { 'equipe/fila': [200, { fila: FILA_BOLETIM }], 'equipe/anexo': [200, { url: BASE + '/boletim-temporario' }], 'equipe/sugestoes': [200, { sugestoes: SUGESTOES }] };
  await ir('/equipe', 'eq-carregando');
  enviados.length = 0;
  r = await js(`
    let aberto = '';
    window.open = () => ({ location: { set href(u) { aberto = u; } }, close() {} });
    const b = document.querySelector('[data-anexo]');
    const rotulo = b ? b.textContent : '';
    b?.click(); for (let i = 0; i < 20 && !aberto; i++) await new Promise(r => setTimeout(r, 100));
    for (let i = 0; i < 20 && document.getElementById('eq-sug-box').hidden; i++) await new Promise(r => setTimeout(r, 100));
    return { rotulo, aberto, aviso: document.querySelector('.eq__item').textContent.includes('apagado assim que você decidir'),
      sug: !document.getElementById('eq-sug-box').hidden, sugTexto: document.getElementById('eq-sugestoes').textContent };`);
  conf('registro com boletim tem o botão "Ver boletim"', r.rotulo, 'Ver boletim');
  conf('e avisa que o boletim é apagado depois da decisão', r.aviso, true);
  conf('o botão pede o link temporário ao servidor, pelo id do registro', enviados.find((e) => e.rota === 'equipe/anexo')?.corpo?.id, FILA_BOLETIM[0].id);
  conf('e abre o link que o servidor devolveu', r.aberto, BASE + '/boletim-temporario');
  conf('mostra as sugestões de apelido com a pesquisa', r.sug && /Kepler descobriu as leis/.test(r.sugTexto), true);
  enviados.length = 0;
  r = await js(`document.querySelector('#eq-sugestoes [data-recusar]').click(); await new Promise(r=>setTimeout(r,100)); return document.getElementById('eq-sug-msg').textContent`);
  conf('recusar sugestão sem motivo é barrado', /escreva o motivo/.test(r) && enviados.length === 0, true);
  await js(`document.querySelector('#eq-sugestoes [data-aprovar]').click(); for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(document.getElementById('eq-sug-msg').textContent) break; }`);
  const dec = enviados.find((e) => e.rota === 'equipe/sugestoes');
  conf('aprovar sugestão manda id e decisão', dec?.corpo && [dec.corpo.id, dec.corpo.decisao], [SUGESTOES[0].id, 'aprovar']);

  console.log('\n--- resgate de prêmio (responsável) ---');
  const PREMIOS = [
    { id: '99999999-0000-0000-0000-000000000001', nome: 'Lupa de bolso', descricao: '', foto: '', pontos: 20, esgotado: false },
    { id: '99999999-0000-0000-0000-000000000002', nome: 'Kit de fósseis', descricao: 'Réplicas', foto: '', pontos: 80, esgotado: false },
    { id: '99999999-0000-0000-0000-000000000003', nome: 'Camiseta', descricao: '', foto: '', pontos: 10, esgotado: true },
  ];
  respostas = { 'clube/painel': [200, PAINEL], 'clube/premios': [200, { premios: PREMIOS, endereco: null }], 'clube/resgatar': [201, PAINEL] };
  enviados.length = 0;
  await ir('/cadastro', 'cad-carregando');
  r = await js(`document.querySelector('[data-resgatar]').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(document.querySelectorAll('.resg__premio').length) break; }
    const ps=[...document.querySelectorAll('.resg__premio input')];
    return {tela:!document.getElementById('cad-resg').hidden, saldo:document.getElementById('resg-saldo').textContent, liberados:ps.filter(i=>!i.disabled).length,
      falta:document.querySelectorAll('.resg__premio')[1].textContent.includes('Faltam 55 pontos'), esgotado:document.querySelectorAll('.resg__premio')[2].textContent.includes('Esgotado')}`);
  conf('abre a tela de resgate com o saldo', [r.tela, r.saldo.startsWith('Saldo: 25 pontos')], [true, true]);
  conf('só o prêmio que cabe no saldo fica liberado', r.liberados, 1);
  conf('mostra quanto falta e o esgotado', [r.falta, r.esgotado], [true, true]);

  r = await js(`document.getElementById('resg-enviar').click(); await new Promise(r=>setTimeout(r,100));
    return [...document.querySelectorAll('#cad-resg .err:not([hidden])')].map(e=>e.id.replace('err-',''))`);
  conf('sem prêmio e sem endereço é barrado (8 pendências: prêmio + 7 do endereço)', r.length, 8);
  conf('nada foi enviado', enviados.filter((e) => e.rota === 'clube/resgatar').length, 0);

  r = await js(`const f=document.getElementById('cad-resg'); const p=(n,v)=>{f.querySelector('[name="'+n+'"]').value=v};
    f.querySelector('.resg__premio input:not([disabled])').click();
    p('entrega.destinatario','Ana Souza'); p('entrega.cep','01310-100'); p('entrega.logradouro','Avenida Paulista'); p('entrega.numero','1000');
    p('entrega.bairro','Bela Vista'); p('entrega.cidade','São Paulo'); p('entrega.uf','SP');
    document.getElementById('resg-enviar').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,150)); if(!document.getElementById('cad-painel').hidden) break; }
    return document.getElementById('cad-feito').textContent`);
  const pedido = enviados.find((e) => e.rota === 'clube/resgatar')?.corpo;
  conf('envia criança, prêmio e endereço', pedido && [pedido.researcherId, pedido.rewardId, pedido.entrega.cep, pedido.entrega.uf], [ID, PREMIOS[0].id, '01310-100', 'SP']);
  conf('o navegador NÃO manda o preço', JSON.stringify(pedido || {}).includes('pontos'), false);
  conf('confirma o pedido', r, 'Resgate pedido! A equipe envia pelos Correios e o código de rastreio aparece aqui.');

  console.log('\n--- resgates (equipe) ---');
  const RESG = [{ id: 'bbbbbbbb-0000-0000-0000-000000000001', apelido: 'Faraday 07', avatar: 'foguete', premio: 'Lupa de bolso', pontos: 20, situacao: 'requested', rastreio: '', data: '2026-10-22T12:00:00.000Z',
    entrega: { destinatario: 'Ana Souza', cep: '01310100', logradouro: 'Avenida Paulista', numero: '1000', complemento: '', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' } }];
  respostas = { 'equipe/fila': [200, { fila: [] }], 'equipe/resgates': [200, { resgates: RESG }], 'equipe/resgate': [200, { resgates: [{ ...RESG[0], situacao: 'shipped', rastreio: 'BR123' }] }] };
  enviados.length = 0;
  await ir('/equipe', 'eq-carregando');
  for (let i = 0; i < 20; i++) { await sleep(150); if (await js("return !document.getElementById('eq-resgates-box').hidden")) break; }
  r = await js("const t=document.getElementById('eq-resgates').textContent; return {cep:t.includes('CEP 01310-100'), dest:t.includes('Ana Souza'), total:document.getElementById('eq-resg-total').textContent}");
  conf('a equipe vê o endereço para postar', [r.cep, r.dest, r.total], [true, true, '1']);
  r = await js(`document.querySelector('[data-acao=cancelar]').click(); await new Promise(r=>setTimeout(r,100)); return document.getElementById('eq-resg-msg').textContent`);
  conf('cancelar sem motivo é barrado', /escreva o motivo/.test(r), true);
  r = await js(`document.querySelector('[data-rastreio]').value='BR123'; document.querySelector('[data-acao=enviar]').click();
    for(let i=0;i<20;i++){ await new Promise(r=>setTimeout(r,100)); if(document.querySelector('[data-acao=entregar]')) break; }
    return {msg:document.getElementById('eq-resg-msg').textContent, entregar:!!document.querySelector('[data-acao=entregar]')}`);
  const acao = enviados.find((e) => e.rota === 'equipe/resgate')?.corpo;
  conf('marcar enviado manda o rastreio', acao && [acao.acao, acao.texto], ['enviar', 'BR123']);
  conf('depois de enviado, o próximo passo é "entregue"', [r.msg, r.entregar], ['Marcado como enviado.', true]);

  conf('nenhum erro de JavaScript', erros, []);
  console.log('\n' + (falhas ? 'FALHAS: ' + falhas + ' de ' + total : 'TUDO OK em ' + total + ' verificações.'));
  cdp.close(); proc.kill();
  setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} process.exit(falhas ? 1 : 0); }, 400);
})().catch((e) => { console.error('ERRO: ' + e.message); proc.kill(); process.exit(1); });
