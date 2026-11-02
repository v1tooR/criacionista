// Prova de que um VISITANTE não lê nem grava as coleções do cadastro.
//   de site/:  node scripts/check-permissoes.mjs
// Token de visitante como o kit faz (shared/rest/client.ts: POST /oauth2/token,
// grantType "anonymous", com o Client ID público). Esperado: 403 em tudo.
// A tentativa de gravar usa dados inválidos de propósito e, se passasse, seria
// um furo — o teste falha e avisa.
import { readFileSync } from 'node:fs';

const clientId = JSON.parse(readFileSync(new URL('../wix.config.json', import.meta.url), 'utf8')).appId;
const t = await (await fetch('https://www.wixapis.com/oauth2/token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, grantType: 'anonymous' }),
})).json();
if (!t.access_token) { console.error('sem token de visitante'); process.exit(1); }

const chamar = async (caminho, corpo) => (await fetch('https://www.wixapis.com' + caminho, {
  method: 'POST', headers: { Authorization: t.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
})).status;

let furos = 0;
for (const c of ['Guardians', 'Researchers', 'GuardianLinks', 'Authorizations']) {
  const s = await chamar('/wix-data/v2/items/query', { dataCollectionId: c, query: {} });
  console.log((s === 403 ? '  ok     ' : '  FURO   ') + 'visitante lendo ' + c + ' → ' + s);
  if (s !== 403) furos++;
}
const s = await chamar('/wix-data/v2/items', { dataCollectionId: 'Researchers', dataItem: { data: { alias: '__teste_permissao__' } } });
console.log((s === 403 ? '  ok     ' : '  FURO   ') + 'visitante gravando em Researchers → ' + s);
if (s !== 403) furos++;
console.log(furos ? '\nFUROS: ' + furos : '\nTUDO FECHADO (5 de 5).');
process.exit(furos ? 1 : 0);
