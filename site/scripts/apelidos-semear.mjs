// Carrega a lista de apelidos (scripts/apelidos.json) na coleção AliasNames.
//   de site/:  node scripts/apelidos-semear.mjs
// Aditivo: nome que já está na coleção (mesmo apelido) fica como está — a equipe
// pode ter editado pelo painel. Rodar de novo só acrescenta os que faltam.
import { readFileSync } from 'node:fs';
import { wix, siteId } from './wix-api.mjs';

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = (s) => semAcento(s.replace(/\s+/g, ' ').trim()).toLowerCase().replace(/[^a-z0-9]/g, '');

const { nomes } = JSON.parse(readFileSync(new URL('./apelidos.json', import.meta.url), 'utf8'));
const atuais = (await wix('POST', '/wix-data/v2/items/query', { dataCollectionId: 'AliasNames', query: { paging: { limit: 1000 } } })).dataItems ?? [];
const existentes = new Set(atuais.map((x) => x.data.aliasKey));

let criados = 0;
for (const n of nomes) {
  const aliasKey = chave(n.apelido);
  if (existentes.has(aliasKey)) continue;
  if (n.apelido.length > 26) throw new Error('apelido longo demais (máx. 26, para caber o número): ' + n.apelido);
  await wix('POST', '/wix-data/v2/items', {
    dataCollectionId: 'AliasNames',
    dataItem: { data: { name: n.nome, alias: n.apelido, aliasKey, born: n.nascimento, birthplace: n.local, facts: n.fatos, source: 'lista', active: true } },
  });
  criados++;
}
console.log('site', siteId, '· já havia', existentes.size, '· criados', criados);
