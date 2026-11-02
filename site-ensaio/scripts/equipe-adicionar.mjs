// Coloca um membro do site na equipe (pode aprovar registros e lançar pontos).
//   de site/:  node scripts/equipe-adicionar.mjs <email-de-login> ["Nome"]
//              node scripts/equipe-adicionar.mjs --listar
// A pessoa precisa já ter conta de membro no site (entrar/criar conta em /entrar).
// Para tirar alguém: no CMS do Wix, coleção "Equipe do clube", mude Situação para "inactive".
// Endpoints: POST /members/v1/members/query (filtro loginEmail $eq, fieldsets EXTENDED)
//            POST /wix-data/v2/items/query e POST /wix-data/v2/items (receita wix-manage CMS).
import { wix } from './wix-api.mjs';

const [arg, nome] = process.argv.slice(2);
const equipe = async () => ((await wix('POST', '/wix-data/v2/items/query', { dataCollectionId: 'TeamMembers', query: { paging: { limit: 100 } } })).dataItems ?? []).map((i) => i.data);

if (!arg || arg === '--listar') {
  const t = await equipe();
  console.log('Equipe: ' + t.length);
  for (const m of t) console.log('  ' + (m.name || '-') + ' · ' + (m.email || '-') + ' · ' + m.role + ' · ' + m.status);
  if (!arg) console.log('\nUso: node scripts/equipe-adicionar.mjs <email> ["Nome"]');
  process.exit(0);
}

const email = arg.trim().toLowerCase();
const r = await wix('POST', '/members/v1/members/query', { fieldsets: ['EXTENDED'], query: { filter: { loginEmail: { $eq: email } } } });
const membro = (r.members ?? [])[0];
if (!membro) { console.error('Nenhum membro do site com o e-mail ' + email + '. A pessoa precisa criar a conta em /entrar primeiro.'); process.exit(1); }

const ja = (await equipe()).find((m) => m.memberId === membro.id && m.status === 'active');
if (ja) { console.log(email + ' já está na equipe.'); process.exit(0); }

await wix('POST', '/wix-data/v2/items', {
  dataCollectionId: 'TeamMembers',
  dataItem: { data: { memberId: membro.id, email, name: nome || membro.profile?.nickname || email, role: 'validador', status: 'active' } },
});
console.log(email + ' agora é da equipe (validador).');
