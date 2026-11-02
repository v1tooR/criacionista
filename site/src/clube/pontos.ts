/**
 * Passo 4b — pontos. SÓ NO SERVIDOR (src/pages/api/*).
 *
 * Submissions: registro de atividade (pending → approved | rejected).
 * PointsLedger: extrato; só se acrescenta. O crédito de um registro é
 *   inserido com _id = _id do registro, e o Wix recusa inserir um _id que já
 *   existe (doc oficial de Insert Data Item: "If you specify an ID that already
 *   exists in the collection, the insertion will fail") — então aprovar duas
 *   vezes, ou repetir depois de uma falha no meio, nunca credita em dobro.
 * Pontos SEMPRE do catálogo (atividades.ts), nunca do navegador.
 * Coleções ADMIN nas 4 permissões; aqui as chamadas sobem com auth.elevate,
 * e cada função recebe o memberId já conferido pela sessão.
 */
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { Recusa } from './recusa';
import { resgatesDaCrianca, type ResgatePainel } from './resgate';
import { atividade as buscarAtividade, equipePodeLancar, responsavelPodeRegistrar, AREAS } from './atividades';
import { anexoDa, chaveApelido, chaveRegistro, detalheLimpo, validarDetalhe, type DadosRegistro, type DetalheRegistro } from './regras';
import { arquivoValido, apagarDeVez, linkTemporario } from './anexos';

const consultar = auth.elevate(items.query);
const inserir = auth.elevate(items.insert);
const atualizar = auth.elevate(items.update);
const obter = auth.elevate(items.get);

type Item = Record<string, any> & { _id: string };

async function buscar(colecao: string, filtro: Record<string, unknown>, limite = 50, ordem?: { campo: string; sentido: 'ASC' | 'DESC' }): Promise<Item[]> {
  const r = await consultar(colecao, {
    filter: filtro, cursorPaging: { limit: limite },
    ...(ordem ? { sort: [{ fieldName: ordem.campo, order: ordem.sentido }] } : {}),
  }, { consistentRead: true });
  return (r.items ?? []) as Item[];
}

export async function ehEquipe(memberId: string): Promise<boolean> {
  return (await buscar('TeamMembers', { memberId, status: 'active' }, 1)).length > 0;
}

const BIM = ['', '1º', '2º', '3º', '4º'];
export function resumoDetalhe(chave: string, d: DetalheRegistro = {}): string {
  const media = d.media != null ? String(d.media).replace('.', ',') : '';
  if (chave === 'media_bimestre') return 'Média do ' + BIM[Number(d.bimestre)] + ' bimestre de ' + d.ano + ': ' + media;
  if (chave === 'media_ano') return 'Média final de ' + d.ano + ': ' + media;
  if (d.titulo != null) return String(d.titulo);
  const [a, m, dia] = String(d.data ?? '').split('-');
  return (d.evento ?? '') + (a ? ' (' + dia + '/' + m + '/' + a + ')' : '');
}
const iso = (v: unknown) => new Date(v as string).toISOString();

/* ---------- painel do responsável ---------- */
export interface PontosCrianca {
  saldo: number;
  extrato: { data: string; descricao: string; pontos: number }[];
  registros: { id: string; atividade: string; resumo: string; situacao: string; pontos: number | null; observacao: string; data: string }[];
  resgates: ResgatePainel[];
}

export async function pontosDaCrianca(researcherId: string): Promise<PontosCrianca> {
  const [lanc, regs, resgates] = await Promise.all([
    buscar('PointsLedger', { researcherId }, 1000, { campo: 'occurredAt', sentido: 'DESC' }),
    buscar('Submissions', { researcherId }, 30, { campo: 'submittedAt', sentido: 'DESC' }),
    resgatesDaCrianca(researcherId),
  ]);
  return {
    saldo: lanc.reduce((s, l) => s + Number(l.amount || 0), 0),
    extrato: lanc.slice(0, 30).map((l) => ({ data: iso(l.occurredAt), descricao: String(l.description), pontos: Number(l.amount) })),
    registros: regs.map((r) => ({
      id: r._id, atividade: buscarAtividade(r.activityKey)?.nome ?? r.activityKey, resumo: resumoDetalhe(r.activityKey, r.details),
      situacao: r.status, pontos: r.points ?? null, observacao: r.status === 'rejected' ? String(r.reviewNotes ?? '') : '',
      data: iso(r.submittedAt ?? r._createdDate),
    })),
    resgates,
  };
}

/* ---------- o responsável registra uma atividade ---------- */
const MAX_PENDENTES = 20;

/**
 * O responsável pode registrar ESTA atividade para ESTA criança? Usado no
 * registro e antes de gerar o endereço de envio de um anexo.
 */
export async function conferirEnvio(memberId: string, researcherId: string, chave: string) {
  const a = buscarAtividade(chave);
  if (!a || !responsavelPodeRegistrar(a)) throw new Recusa(400, { 'registro.atividade': 'Esta atividade não pode ser registrada pelo responsável.' });
  const d = { researcherId };

  // a criança é DESTE responsável, está ativa e com a participação autorizada
  const [vinculo] = await buscar('GuardianLinks', { guardianMemberId: memberId, researcherId: d.researcherId, status: 'active' }, 1);
  if (!vinculo) throw new Recusa(404, { geral: 'Membro pesquisador não encontrado neste cadastro.' });
  const crianca = await obter('Researchers', d.researcherId, { consistentRead: true });
  const aut = await buscar('Authorizations', { researcherId: d.researcherId, guardianMemberId: memberId, authorizationType: 'participacao', status: 'accepted' }, 1);
  if (!crianca || crianca.status !== 'active' || !aut.length) throw new Recusa(403, { geral: 'Este membro pesquisador está sem a autorização de participação.' });

  // foto e vídeo da criança: só com a autorização de imagem em vigor
  if (a.imagem) {
    const img = await buscar('Authorizations', { researcherId: d.researcherId, guardianMemberId: memberId, authorizationType: 'imagem', status: 'accepted' }, 1);
    if (!img.length) throw new Recusa(403, { 'registro.atividade': 'Foto e vídeo precisam da autorização de imagem. Sem ela, envie texto ou link.' });
  }
  return a;
}

export async function registrar(memberId: string, d: DadosRegistro): Promise<void> {
  const a = await conferirEnvio(memberId, d.researcherId, d.atividade);
  // o anexo tem de ser privado e desta criança (subido pelo endereço que o servidor gerou)
  const tipoAnexo = anexoDa(a);
  if (tipoAnexo && d.detalhe.arquivo && !(await arquivoValido(String(d.detalhe.arquivo), d.researcherId, tipoAnexo))) {
    throw new Recusa(422, { 'registro.arquivo': 'O arquivo não chegou direito. Envie de novo.' });
  }

  const pendentes = await buscar('Submissions', { researcherId: d.researcherId, status: 'pending' }, MAX_PENDENTES);
  if (pendentes.length >= MAX_PENDENTES) throw new Recusa(429, { geral: 'Há muitos registros esperando a equipe. Aguarde a conferência dos que já foram enviados.' });

  const claimKey = chaveRegistro(d);
  if ((await buscar('Submissions', { researcherId: d.researcherId, claimKey }, 5)).some((r) => r.status !== 'rejected')) {
    throw new Recusa(409, { geral: 'Esta atividade já foi registrada para este membro pesquisador.' });
  }
  await inserir('Submissions', {
    researcherId: d.researcherId, activityKey: a.chave, area: a.area, details: detalheLimpo(a.area, a.chave, d.detalhe),
    claimKey, status: 'pending', origin: 'responsavel', submittedByMemberId: memberId, submittedAt: new Date(),
  });
}

/* ---------- equipe ---------- */
export interface ItemFila { id: string; apelido: string; avatar: string; area: string; atividade: string; pontos: number; resumo: string; link: string; texto: string; anexo: string; data: string }

export async function filaEquipe(): Promise<ItemFila[]> {
  const pend = await buscar('Submissions', { status: 'pending' }, 100, { campo: 'submittedAt', sentido: 'ASC' });
  const cache = new Map<string, Item | null>();
  const out: ItemFila[] = [];
  for (const r of pend) {
    const id = String(r.researcherId);
    if (!cache.has(id)) cache.set(id, (await obter('Researchers', id, { consistentRead: true })) as Item | null);
    const c = cache.get(id);
    const a = buscarAtividade(r.activityKey);
    // a equipe vê só o apelido: nome real e dados do responsável ficam de fora
    out.push({
      id: r._id, apelido: c?.alias ?? '(removido)', avatar: c?.avatar ?? '', area: AREAS[a?.area ?? 'participacao'],
      atividade: a?.nome ?? r.activityKey, pontos: a?.pontos ?? 0, resumo: resumoDetalhe(r.activityKey, r.details),
      link: String(r.details?.link ?? ''), texto: String(r.details?.texto ?? ''),
      // só diz SE há anexo e de que tipo; o arquivo a equipe abre por link temporário
      anexo: r.details?.arquivo ? (a?.anexo ?? 'arquivo') : '',
      data: iso(r.submittedAt ?? r._createdDate),
    });
  }
  return out;
}

async function creditar(r: Item, pontos: number, nome: string, equipeId: string): Promise<void> {
  try {
    await inserir('PointsLedger', {
      _id: r._id, researcherId: r.researcherId, amount: pontos, transactionType: 'activity', activityKey: r.activityKey,
      sourceCollection: 'Submissions', sourceItemId: r._id, description: nome + ' — ' + resumoDetalhe(r.activityKey, r.details),
      createdByMemberId: equipeId, occurredAt: new Date(),
    });
  } catch (e) {
    // já creditado antes (mesmo _id): é a trava funcionando, não um erro
    if (await obter('PointsLedger', r._id, { consistentRead: true })) return;
    throw e;
  }
}

/** Aprova ou recusa um registro. Idempotente: repetir a aprovação não credita de novo. */
export async function decidir(equipeId: string, claimId: string, aprovar: boolean, observacao: string): Promise<void> {
  const r = (await obter('Submissions', claimId, { consistentRead: true })) as Item | null;
  if (!r) throw new Recusa(404, { geral: 'Registro não encontrado.' });
  if (r.status === 'rejected' || (r.status === 'approved' && !aprovar)) throw new Recusa(409, { geral: 'Este registro já foi decidido.' });

  const arquivo = String(r.details?.arquivo ?? '');
  if (!aprovar) {
    await atualizar('Submissions', { ...r, status: 'rejected', reviewedByMemberId: equipeId, reviewedAt: new Date(), reviewNotes: observacao, details: semArquivo(r.details) });
    await apagarDeVez([arquivo]); // recusado: o anexo não fica guardado
    return;
  }
  const a = buscarAtividade(r.activityKey);
  if (!a) throw new Recusa(400, { geral: 'Atividade desconhecida.' });
  await creditar(r, a.pontos, a.nome, equipeId);
  // o boletim só serve para conferir a média: decidido, é apagado
  const apagaBoletim = a.anexo === 'boletim' && !!arquivo;
  if (r.status !== 'approved') {
    await atualizar('Submissions', { ...r, status: 'approved', points: a.pontos, reviewedByMemberId: equipeId, reviewedAt: new Date(), ...(observacao ? { reviewNotes: observacao } : {}), ...(apagaBoletim ? { details: semArquivo(r.details) } : {}) });
  }
  if (apagaBoletim) await apagarDeVez([arquivo]);
}

/** Tira o id do arquivo do registro e marca que ele foi apagado. */
const semArquivo = (det: any) => {
  if (!det?.arquivo) return det;
  const { arquivo, ...resto } = det;
  return { ...resto, arquivoApagadoEm: new Date().toISOString() };
};

/** Link temporário para a equipe abrir o anexo de um registro esperando conferência. */
export async function anexoParaEquipe(claimId: string): Promise<string> {
  const r = (await obter('Submissions', claimId, { consistentRead: true })) as Item | null;
  if (!r || !r.details?.arquivo) throw new Recusa(404, { geral: 'Este registro não tem anexo (ou ele já foi apagado).' });
  return linkTemporario(String(r.details.arquivo));
}

/** A equipe lança direto (ex.: presença conferida no credenciamento da palestra). */
export async function lancar(equipeId: string, apelido: string, chave: string, detalhe: DetalheRegistro): Promise<{ apelido: string; pontos: number }> {
  const a = buscarAtividade(chave);
  if (!a || !equipePodeLancar(a)) throw new Recusa(400, { 'lancar.atividade': 'Escolha uma atividade de participação.' });
  const erros = validarDetalhe(a.area, a.chave, detalhe);
  if (Object.keys(erros).length) throw new Recusa(422, erros);
  const [c] = await buscar('Researchers', { aliasKey: chaveApelido(apelido) }, 1);
  if (!c || c.status !== 'active') throw new Recusa(404, { 'lancar.apelido': 'Nenhum membro pesquisador ativo com esse apelido.' });

  const dados: DadosRegistro = { researcherId: c._id, atividade: a.chave, detalhe };
  const claimKey = chaveRegistro(dados);
  if ((await buscar('Submissions', { researcherId: c._id, claimKey }, 5)).some((r) => r.status !== 'rejected')) {
    throw new Recusa(409, { geral: 'Esta atividade já está registrada para ' + c.alias + '.' });
  }
  const r = (await inserir<Record<string, any>>('Submissions', {
    researcherId: c._id, activityKey: a.chave, area: a.area, details: detalheLimpo(a.area, a.chave, detalhe),
    claimKey, status: 'pending', origin: 'equipe', submittedByMemberId: equipeId, submittedAt: new Date(),
  })) as Item;
  await decidir(equipeId, r._id, true, 'Lançado pela equipe');
  return { apelido: c.alias, pontos: a.pontos };
}
