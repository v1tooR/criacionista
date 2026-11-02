// Cria as coleções do cadastro (passo 4a) no CMS do site do cliente.
//   de site/:  node scripts/cria-colecoes.mjs
// Aditivo: coleção que já existe é deixada como está (não altera, não apaga).
// Endpoint e formato: receita wix-manage/references/cms/cms-schema-management.md
//   POST /wix-data/v2/collections
//
// TODAS com permissão ADMIN nas quatro operações: dado de criança e CPF não
// podem ser lidos nem gravados pelo navegador. Quem lê e grava é o servidor do
// site (src/pages/api/clube/*), depois de conferir quem é o membro logado.
// Modelo: wix-handoff/collections.md (+ Guardians, que lá não existia).
import { wix } from './wix-api.mjs';

const ADMIN = { insert: 'ADMIN', update: 'ADMIN', remove: 'ADMIN', read: 'ADMIN' };
const ref = (para) => ({ type: 'REFERENCE', typeMetadata: { reference: { referencedCollectionId: para } } });

const COLECOES = [
  {
    id: 'Guardians', displayName: 'Responsáveis', displayField: 'fullName',
    fields: [
      { key: 'memberId', displayName: 'ID do membro', type: 'TEXT', required: true },
      { key: 'fullName', displayName: 'Nome completo', type: 'TEXT', required: true },
      { key: 'cpf', displayName: 'CPF (só números)', type: 'TEXT', required: true },
      { key: 'phone', displayName: 'Telefone', type: 'TEXT' },
      { key: 'email', displayName: 'E-mail da conta', type: 'TEXT' },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
    ],
  },
  {
    id: 'Researchers', displayName: 'Membros pesquisadores', displayField: 'alias',
    fields: [
      { key: 'alias', displayName: 'Apelido', type: 'TEXT', required: true },
      { key: 'aliasKey', displayName: 'Apelido normalizado (único)', type: 'TEXT', required: true },
      { key: 'firstName', displayName: 'Primeiro nome', type: 'TEXT', required: true },
      { key: 'birthYear', displayName: 'Ano de nascimento', type: 'NUMBER', required: true },
      { key: 'avatar', displayName: 'Avatar', type: 'TEXT', required: true },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
      { key: 'joinedAt', displayName: 'Entrou em', type: 'DATETIME' },
    ],
  },
  {
    id: 'GuardianLinks', displayName: 'Vínculos responsável–criança', displayField: 'relationship',
    fields: [
      { key: 'guardianMemberId', displayName: 'ID do membro responsável', type: 'TEXT', required: true },
      { key: 'researcherId', displayName: 'Membro pesquisador', ...ref('Researchers'), required: true },
      { key: 'relationship', displayName: 'Relação', type: 'TEXT', required: true },
      { key: 'isPrimary', displayName: 'Responsável principal', type: 'BOOLEAN' },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
    ],
  },
  {
    id: 'Authorizations', displayName: 'Autorizações dos responsáveis', displayField: 'authorizationType',
    fields: [
      { key: 'researcherId', displayName: 'Membro pesquisador', ...ref('Researchers'), required: true },
      { key: 'guardianMemberId', displayName: 'ID do membro responsável', type: 'TEXT', required: true },
      { key: 'authorizationType', displayName: 'Tipo', type: 'TEXT', required: true },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
      { key: 'acceptedAt', displayName: 'Aceita em', type: 'DATETIME' },
      { key: 'revokedAt', displayName: 'Revogada em', type: 'DATETIME' },
      { key: 'documentVersion', displayName: 'Versão do texto', type: 'TEXT', required: true },
      { key: 'documentText', displayName: 'Texto aceito', type: 'TEXT', required: true },
      { key: 'evidence', displayName: 'Evidência do aceite', type: 'OBJECT' },
    ],
  },
  /* ---- passo 4b: pontos ---- */
  {
    // registro de atividade (o responsável registra, a equipe aprova; ou a equipe lança direto)
    id: 'Submissions', displayName: 'Registros de atividade', displayField: 'activityKey',
    fields: [
      { key: 'researcherId', displayName: 'Membro pesquisador', ...ref('Researchers'), required: true },
      { key: 'activityKey', displayName: 'Atividade', type: 'TEXT', required: true },
      { key: 'area', displayName: 'Área', type: 'TEXT', required: true },
      { key: 'details', displayName: 'Detalhes', type: 'OBJECT' },
      { key: 'claimKey', displayName: 'Chave anti-repetição', type: 'TEXT', required: true },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
      { key: 'origin', displayName: 'Quem registrou', type: 'TEXT', required: true },
      { key: 'points', displayName: 'Pontos', type: 'NUMBER' },
      { key: 'submittedByMemberId', displayName: 'Registrado por (membro)', type: 'TEXT', required: true },
      { key: 'submittedAt', displayName: 'Registrado em', type: 'DATETIME' },
      { key: 'reviewedByMemberId', displayName: 'Conferido por (membro)', type: 'TEXT' },
      { key: 'reviewedAt', displayName: 'Conferido em', type: 'DATETIME' },
      { key: 'reviewNotes', displayName: 'Observação da equipe', type: 'TEXT' },
    ],
  },
  {
    // extrato: só se acrescenta; crédito de um registro usa o _id DO REGISTRO,
    // então um segundo crédito do mesmo registro é recusado pelo próprio Wix
    id: 'PointsLedger', displayName: 'Extrato de pontos', displayField: 'description',
    fields: [
      { key: 'researcherId', displayName: 'Membro pesquisador', ...ref('Researchers'), required: true },
      { key: 'amount', displayName: 'Pontos (+/-)', type: 'NUMBER', required: true },
      { key: 'transactionType', displayName: 'Tipo', type: 'TEXT', required: true },
      { key: 'activityKey', displayName: 'Atividade', type: 'TEXT' },
      { key: 'sourceCollection', displayName: 'Origem (coleção)', type: 'TEXT' },
      { key: 'sourceItemId', displayName: 'Origem (item)', type: 'TEXT' },
      { key: 'description', displayName: 'Descrição', type: 'TEXT', required: true },
      { key: 'createdByMemberId', displayName: 'Lançado por (membro)', type: 'TEXT', required: true },
      { key: 'occurredAt', displayName: 'Data', type: 'DATETIME', required: true },
    ],
  },
  {
    // quem pode aprovar e lançar pontos (o dono adiciona pelo CMS ou por scripts/equipe-adicionar.mjs)
    id: 'TeamMembers', displayName: 'Equipe do clube', displayField: 'name',
    fields: [
      { key: 'memberId', displayName: 'ID do membro', type: 'TEXT', required: true },
      { key: 'email', displayName: 'E-mail', type: 'TEXT' },
      { key: 'name', displayName: 'Nome', type: 'TEXT' },
      { key: 'role', displayName: 'Papel', type: 'TEXT', required: true },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
    ],
  },
  /* ---- passo 4b: resgate de prêmios (só por pontos, entrega pelos Correios) ---- */
  {
    // o clube cadastra e edita os prêmios pelo painel do Wix (CMS → "Prêmios")
    id: 'Rewards', displayName: 'Prêmios', displayField: 'title',
    fields: [
      { key: 'title', displayName: 'Nome do prêmio', type: 'TEXT', required: true },
      { key: 'description', displayName: 'Descrição curta', type: 'TEXT' },
      { key: 'image', displayName: 'Foto', type: 'IMAGE' },
      { key: 'pointsPrice', displayName: 'Custa (pontos)', type: 'NUMBER', required: true },
      { key: 'stock', displayName: 'Estoque (vazio = sem limite)', type: 'NUMBER' },
      { key: 'active', displayName: 'Disponível para resgate', type: 'BOOLEAN' },
    ],
  },
  {
    // pedido de resgate: o débito no extrato usa o _id DO RESGATE (mesma trava do crédito)
    id: 'Redemptions', displayName: 'Resgates', displayField: 'rewardTitle',
    fields: [
      { key: 'researcherId', displayName: 'Membro pesquisador', ...ref('Researchers'), required: true },
      { key: 'rewardId', displayName: 'Prêmio', ...ref('Rewards'), required: true },
      { key: 'rewardTitle', displayName: 'Prêmio (nome no dia)', type: 'TEXT', required: true },
      { key: 'pointsSpent', displayName: 'Pontos', type: 'NUMBER', required: true },
      { key: 'status', displayName: 'Situação', type: 'TEXT', required: true },
      { key: 'shipping', displayName: 'Endereço de entrega', type: 'OBJECT', required: true },
      { key: 'trackingCode', displayName: 'Código de rastreio', type: 'TEXT' },
      { key: 'notes', displayName: 'Observação da equipe', type: 'TEXT' },
      { key: 'requestedByMemberId', displayName: 'Pedido por (membro)', type: 'TEXT', required: true },
      { key: 'requestedAt', displayName: 'Pedido em', type: 'DATETIME', required: true },
      { key: 'updatedByMemberId', displayName: 'Atualizado por (membro)', type: 'TEXT' },
    ],
  },
];

const existentes = new Set(((await wix('GET', '/wix-data/v2/collections?fields=displayName')).collections ?? []).map((c) => c.id));
const resultado = [];
for (const c of COLECOES) {
  if (existentes.has(c.id)) { resultado.push({ id: c.id, criada: false, motivo: 'já existia' }); continue; }
  const r = await wix('POST', '/wix-data/v2/collections', { collection: { ...c, permissions: ADMIN } });
  resultado.push({ id: c.id, criada: true, campos: (r.collection?.fields ?? []).filter((f) => !f.key.startsWith('_')).length });
}

// confere de volta: permissões e campos como pedidos
for (const c of COLECOES) {
  const r = (await wix('GET', '/wix-data/v2/collections/' + c.id)).collection;
  const p = r.permissions ?? {};
  const fechada = ['insert', 'update', 'remove', 'read'].every((k) => p[k] === 'ADMIN');
  const faltam = c.fields.filter((f) => !r.fields.some((x) => x.key === f.key && x.type === f.type)).map((f) => f.key);
  const item = resultado.find((x) => x.id === c.id);
  item.permissoes = fechada ? 'ADMIN nas 4' : JSON.stringify(p);
  item.camposFaltando = faltam;
}
console.log(JSON.stringify(resultado, null, 1));
if (resultado.some((x) => x.permissoes !== 'ADMIN nas 4' || x.camposFaltando.length)) process.exit(1);
