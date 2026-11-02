/**
 * Diagnóstico das permissões Velo no site do cliente.
 *
 * Existe para uma pergunta só: **já dá para rodar o attach e o release?**
 * No dia em que alguém mexer nas permissões, ou em que o proprietário fizer
 * login no CLI, rode isto antes de tentar qualquer coisa — a resposta sai em
 * meio minuto, em vez de depois de um attach que falha no meio.
 *
 * Todas as sondas são somente leitura, com uma exceção comentada no lugar
 * (a de identidade, que não consegue escrever nada). Nenhuma credencial é
 * impressa.
 * O raciocínio por trás de cada sonda está em wix-handoff/velo.md.
 *
 * Uso:  node scripts/diag-velo.mjs
 */
import { spawnSync } from 'node:child_process';

import { readFileSync, existsSync } from 'node:fs';

const SITE = '947bef68-f229-4456-956e-087f824170fd';   // metaSiteId de clubecriacionista.com
/* depois de um attach (ou do download da migração) o app que importa é o do
   wix.config.json; antes dele, só existia o app OAuth criado no painel */
const CONFIG = new URL('../site/wix.config.json', import.meta.url);
const APP = existsSync(CONFIG)
  ? JSON.parse(readFileSync(CONFIG, 'utf8')).appId
  : 'ba17808f-8c79-4119-bbe3-4e2e2e7d9184';             // app OAuth do painel, 14/10/2026
console.log('app sondado: ' + APP + (existsSync(CONFIG) ? '  (de site/wix.config.json)' : '  (app do painel)'));
const MANAGE = 'https://manage.wix.com';
const API = 'https://www.wixapis.com';
const CLI = '@wix/cli@latest';

const cli = (args) => spawnSync('npx', ['-y', CLI, ...args], { encoding: 'utf8', timeout: 180000, shell: true });

console.log('quem está logado no CLI');
const who = cli(['whoami']);
console.log('  ' + ((who.stdout || who.stderr || '').trim() || '(sem resposta)'));

/* o CLI emite um token novo a cada chamada, então nunca é cache velho */
const tokenSite = (cli(['token', '--site', SITE]).stdout || '').trim();
const tokenConta = (cli(['token']).stdout || '').trim();
if (!tokenSite) { console.log('\nsem token de site — o CLI está deslogado?'); process.exit(1); }

const chamar = async (base, caminho, { token = tokenSite, site = true, method = 'GET', corpo } = {}) => {
  try {
    const res = await fetch(base + caminho, {
      method,
      headers: {
        Authorization: token, 'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'nocheck', Cookie: 'XSRF-TOKEN=nocheck', 'User-Agent': 'wix-cli',
        ...(site ? { 'wix-site-id': SITE } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const txt = await res.text();
    const perm = (txt.match(/Permission '([A-Z_.]+)' denied/) || [])[1] || '';
    return { status: res.status, perm, txt };
  } catch (e) { return { status: 0, perm: '', txt: e.message }; }
};

const SONDAS = [
  { g: 'controle', n: 'propriedades do site (permissão básica)',
    f: () => chamar(API, '/site-properties/v4/properties'), espero: 200 },
  { g: 'controle', n: 'colaboradores (permissão elevada de site)',
    f: () => chamar(API, '/roles-management/v2/contributors/query'), espero: 200 },

  { g: 'attach', n: 'companion app existe?',
    f: () => chamar(MANAGE, `/_api/companion-apps/v1/companion-apps/${APP}`) },
  { g: 'attach', n: 'listar companion apps',
    f: () => chamar(MANAGE, '/_api/companion-apps/v1/companion-apps'), espero: 200 },
  /* NÃO sondar `get-or-create` com token de site: apesar do nome, é um POST
     que CRIA o companion app quando a permissão existe. Foi o que aconteceu
     em 21/10/2026 — a primeira rodada com a sessão do proprietário criou o
     app antes do attach. O GET de listagem acima testa a mesma permissão
     sem efeito colateral. */
  { g: 'attach', n: 'projeto de hospedagem',
    f: () => chamar(MANAGE, `/_api/wix-code-app-projects/v1/app-projects/${APP}`), espero: 200 },

  { g: 'release', n: 'releases (o que o `wix release` escreve)',
    f: () => chamar(MANAGE, `/_api/wix-code-app-releases/v1/app-projects/${APP}/app-releases/query`, { method: 'POST', corpo: { query: { cursorPaging: { limit: 5 } } } }), espero: 200 },
  { g: 'release', n: 'deployments',
    f: () => chamar(MANAGE, `/_api/wix-code-app-deployments/v1/app-projects/${APP}/app-deployments/query`, { method: 'POST', corpo: { query: { cursorPaging: { limit: 5 } } } }), espero: 200 },

  /* Esta é um POST de escrita, mas sem site no contexto ela não tem onde
     criar nada: responde 400 "missing metaSiteId" e para aí. Fica porque é a
     evidência de que o endpoint aceita a identidade de conta (velo.md, §5). */
  { g: 'identidade', n: 'get-or-create com token de CONTA (sem site)',
    f: () => chamar(MANAGE, '/_api/companion-apps/v1/companion-apps/get-or-create', { token: tokenConta, site: false, method: 'POST', corpo: {} }) },
];

/* Ausência de 403 não é sucesso. Para as sondas que importam (espero 200):
 *   2xx       → permissão confirmada
 *   404       → permissão aceita, recurso ainda não existe (ex.: projeto antes do attach)
 *   403       → negado
 *   401, 5xx, falha de rede → INCONCLUSIVO: não diz nada sobre a permissão
 * Até 21/10/2026 o script contava só 403 e declarava "DESTRAVOU" mesmo com
 * 401 ou 500 — apontado em wix-handoff/validacao-wix.md. */
let bloqueios = 0, inconclusivas = 0, grupo = '';
for (const s of SONDAS) {
  if (s.g !== grupo) { grupo = s.g; console.log('\n--- ' + grupo + ' ---'); }
  const r = await s.f();
  let marca = '';
  if (s.espero === 200) {
    if (r.status === 403) { bloqueios++; marca = '   NEGADO'; }
    else if (r.status === 0 || r.status === 401 || r.status >= 500) { inconclusivas++; marca = '   INCONCLUSIVO'; }
  }
  console.log('  ' + String(r.status).padEnd(4) + s.n + (r.perm ? '   [' + r.perm + ']' : '') + marca);
}

console.log('\n==============================');
if (inconclusivas > 0) {
  console.log('INCONCLUSIVO: ' + inconclusivas + ' sonda(s) sem resposta útil (401, 5xx ou rede).');
  console.log('Isso não diz nada sobre permissão. Confira login e conexão e rode de novo.');
} else if (bloqueios === 0) {
  console.log('DESTRAVOU. Nenhuma chamada de attach/release foi negada.');
  console.log('Isso prova permissão, não que um release vá funcionar — ver wix-handoff/validacao-wix.md.');
} else {
  console.log('AINDA TRAVADO: ' + bloqueios + ' chamada(s) de attach/release negadas com 403.');
  console.log('As permissões VELO.* continuam reservadas ao proprietário da conta.');
  console.log('Contexto e caminhos possíveis: wix-handoff/velo.md');
}
