// Confere (SÓ LEITURA) o que está gravado nas coleções do cadastro.
//   de site/:  node scripts/confere-cadastro.mjs
// Mostra o CPF mascarado e não mostra o texto completo das autorizações.
// Endpoint: POST /wix-data/v2/items/query (receita wix-manage cms-data-items-crud.md).
import { wix } from './wix-api.mjs';

async function todos(colecao) {
  const r = await wix('POST', '/wix-data/v2/items/query', { dataCollectionId: colecao, query: { paging: { limit: 100 } } });
  return (r.dataItems ?? []).map((i) => ({ _id: i.id, ...i.data }));
}
const mascara = (cpf = '') => cpf.replace(/^(\d{3})\d{6}(\d{2})$/, '$1.***.***-$2');

const [resp, criancas, vinculos, auts] = await Promise.all(['Guardians', 'Researchers', 'GuardianLinks', 'Authorizations'].map(todos));
console.log('Responsáveis: ' + resp.length);
for (const g of resp) console.log('  ' + g.fullName + ' · CPF ' + mascara(g.cpf) + ' · ' + (g.email || 'sem e-mail') + ' · membro ' + g.memberId.slice(0, 8) + '…');
console.log('Membros pesquisadores: ' + criancas.length);
for (const c of criancas) {
  const v = vinculos.filter((x) => x.researcherId === c._id);
  const a = auts.filter((x) => x.researcherId === c._id).map((x) => x.authorizationType + ':' + x.status + ' (' + x.documentVersion + ')');
  console.log('  ' + c.alias + ' [' + c.aliasKey + '] · ' + c.firstName + ' · ' + c.birthYear + ' · avatar ' + c.avatar + ' · ' + c.status +
    '\n    vínculos: ' + v.map((x) => x.relationship + '/' + x.status).join(', ') + '\n    autorizações: ' + a.join(', '));
}
const orfas = criancas.filter((c) => !vinculos.some((v) => v.researcherId === c._id));
if (orfas.length) console.log('ATENÇÃO: ' + orfas.length + ' criança(s) sem vínculo (cadastro interrompido no meio)');
