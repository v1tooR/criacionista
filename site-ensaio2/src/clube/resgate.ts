/**
 * Resgate de prêmios por pontos (passo 4b). SÓ NO SERVIDOR.
 *
 * Rewards: o clube cadastra pelo painel do Wix (CMS → "Prêmios").
 * Redemptions: requested → shipped → delivered, ou cancelled.
 *
 * Débito: lançamento NEGATIVO no extrato com _id = _id do resgate (o Wix recusa
 * _id repetido, então o mesmo resgate nunca debita duas vezes). Saldo = soma do
 * extrato. Dois pedidos ao mesmo tempo podem passar da conferência de saldo
 * juntos; por isso, DEPOIS de debitar, o saldo é conferido de novo e, se ficou
 * negativo, o resgate é desfeito (estorno + cancelado). Ninguém fica no vermelho.
 *
 * Só o responsável pede, pelo próprio painel; a entrega é pelos Correios.
 */
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { imgSrc } from '../wix/media';
import { Recusa } from './recusa';
import { enderecoLimpo, type Endereco } from './regras';

const consultar = auth.elevate(items.query);
const inserir = auth.elevate(items.insert);
const atualizar = auth.elevate(items.update);
const obter = auth.elevate(items.get);

type Item = Record<string, any> & { _id: string };

async function buscar(colecao: string, filtro: Record<string, unknown>, limite = 100, ordem?: { campo: string; sentido: 'ASC' | 'DESC' }): Promise<Item[]> {
  const r = await consultar(colecao, {
    filter: filtro, cursorPaging: { limit: limite },
    ...(ordem ? { sort: [{ fieldName: ordem.campo, order: ordem.sentido }] } : {}),
  }, { consistentRead: true });
  return (r.items ?? []) as Item[];
}

const saldoDe = async (researcherId: string) =>
  (await buscar('PointsLedger', { researcherId }, 1000)).reduce((s, l) => s + Number(l.amount || 0), 0);

/* ---------- prêmios ---------- */
export interface Premio { id: string; nome: string; descricao: string; foto: string; pontos: number; esgotado: boolean }

export async function listarPremios(): Promise<Premio[]> {
  const lista = await buscar('Rewards', { active: true }, 100, { campo: 'pointsPrice', sentido: 'ASC' });
  return lista
    .filter((p) => Number(p.pointsPrice) > 0)
    .map((p) => ({
      id: p._id, nome: String(p.title), descricao: String(p.description ?? ''),
      foto: p.image ? imgSrc(p.image, 400, 400) : '', pontos: Number(p.pointsPrice),
      esgotado: p.stock != null && p.stock !== '' && Number(p.stock) <= 0,
    }));
}

/* ---------- resgates no painel do responsável ---------- */
export interface ResgatePainel { id: string; premio: string; pontos: number; situacao: string; rastreio: string; observacao: string; data: string }

export async function resgatesDaCrianca(researcherId: string): Promise<ResgatePainel[]> {
  const lista = await buscar('Redemptions', { researcherId }, 30, { campo: 'requestedAt', sentido: 'DESC' });
  return lista.map((r) => ({
    id: r._id, premio: String(r.rewardTitle), pontos: Number(r.pointsSpent), situacao: String(r.status),
    rastreio: String(r.trackingCode ?? ''), observacao: r.status === 'cancelled' ? String(r.notes ?? '') : '',
    data: new Date(r.requestedAt).toISOString(),
  }));
}

/** O último endereço usado por este responsável, para não digitar de novo. */
export async function ultimoEndereco(memberId: string): Promise<Endereco | null> {
  const [r] = await buscar('Redemptions', { requestedByMemberId: memberId }, 1, { campo: 'requestedAt', sentido: 'DESC' });
  return r?.shipping ? enderecoLimpo(r.shipping) : null;
}

/* ---------- pedir ---------- */
export async function resgatar(memberId: string, researcherId: string, rewardId: string, endereco: Endereco): Promise<void> {
  // a criança é DESTE responsável, ativa e com a participação autorizada
  const [vinculo] = await buscar('GuardianLinks', { guardianMemberId: memberId, researcherId, status: 'active' }, 1);
  if (!vinculo) throw new Recusa(404, { geral: 'Membro pesquisador não encontrado neste cadastro.' });
  const crianca = await obter('Researchers', researcherId, { consistentRead: true });
  const aut = await buscar('Authorizations', { researcherId, guardianMemberId: memberId, authorizationType: 'participacao', status: 'accepted' }, 1);
  if (!crianca || crianca.status !== 'active' || !aut.length) throw new Recusa(403, { geral: 'Este membro pesquisador está sem a autorização de participação.' });

  const premio = (await obter('Rewards', rewardId, { consistentRead: true })) as Item | null;
  const preco = Number(premio?.pointsPrice);
  if (!premio || premio.active !== true || !(preco > 0)) throw new Recusa(404, { geral: 'Este prêmio não está disponível.' });
  const temEstoque = premio.stock != null && premio.stock !== '';
  if (temEstoque && Number(premio.stock) <= 0) throw new Recusa(409, { geral: 'Este prêmio esgotou.' });

  if ((await saldoDe(researcherId)) < preco) throw new Recusa(409, { geral: 'Pontos insuficientes para este prêmio.' });

  const resg = (await inserir<Record<string, any>>('Redemptions', {
    researcherId, rewardId, rewardTitle: String(premio.title), pointsSpent: preco, status: 'requested',
    shipping: enderecoLimpo(endereco), requestedByMemberId: memberId, requestedAt: new Date(),
  })) as Item;

  await inserir('PointsLedger', {
    _id: resg._id, researcherId, amount: -preco, transactionType: 'redemption',
    sourceCollection: 'Redemptions', sourceItemId: resg._id, description: 'Resgate — ' + premio.title,
    createdByMemberId: memberId, occurredAt: new Date(),
  });

  // dois pedidos simultâneos podem ter passado juntos pela conferência: confere de novo
  if ((await saldoDe(researcherId)) < 0) {
    await estornar(resg, memberId, 'Saldo insuficiente no momento do pedido.');
    throw new Recusa(409, { geral: 'Pontos insuficientes para este prêmio.' });
  }

  if (temEstoque) await atualizar('Rewards', { ...premio, stock: Math.max(0, Number(premio.stock) - 1) });
}

/** Devolve os pontos de um resgate (uma vez só) e marca cancelado. */
async function estornar(resg: Item, quemId: string, motivo: string): Promise<void> {
  const jaEstornado = (await buscar('PointsLedger', { sourceItemId: resg._id, transactionType: 'reversal' }, 1)).length > 0;
  if (!jaEstornado) {
    await inserir('PointsLedger', {
      researcherId: resg.researcherId, amount: Number(resg.pointsSpent), transactionType: 'reversal',
      sourceCollection: 'Redemptions', sourceItemId: resg._id, description: 'Estorno — ' + resg.rewardTitle,
      createdByMemberId: quemId, occurredAt: new Date(),
    });
  }
  await atualizar('Redemptions', { ...resg, status: 'cancelled', notes: motivo, updatedByMemberId: quemId });
}

/* ---------- equipe ---------- */
export interface ResgateEquipe {
  id: string; apelido: string; avatar: string; premio: string; pontos: number; situacao: string;
  rastreio: string; entrega: Endereco; data: string;
}

export async function filaResgates(): Promise<ResgateEquipe[]> {
  const abertos = [
    ...(await buscar('Redemptions', { status: 'requested' }, 100, { campo: 'requestedAt', sentido: 'ASC' })),
    ...(await buscar('Redemptions', { status: 'shipped' }, 100, { campo: 'requestedAt', sentido: 'ASC' })),
  ];
  const cache = new Map<string, Item | null>();
  const out: ResgateEquipe[] = [];
  for (const r of abertos) {
    const id = String(r.researcherId);
    if (!cache.has(id)) cache.set(id, (await obter('Researchers', id, { consistentRead: true })) as Item | null);
    const c = cache.get(id);
    out.push({
      id: r._id, apelido: c?.alias ?? '(removido)', avatar: c?.avatar ?? '', premio: String(r.rewardTitle),
      pontos: Number(r.pointsSpent), situacao: String(r.status), rastreio: String(r.trackingCode ?? ''),
      entrega: enderecoLimpo(r.shipping), data: new Date(r.requestedAt).toISOString(),
    });
  }
  return out;
}

/** enviar (com rastreio opcional) → entregue; ou cancelar (com motivo, devolve os pontos e o estoque). */
export async function atualizarResgate(equipeId: string, id: string, acao: 'enviar' | 'entregar' | 'cancelar', texto: string): Promise<void> {
  const r = (await obter('Redemptions', id, { consistentRead: true })) as Item | null;
  if (!r) throw new Recusa(404, { geral: 'Resgate não encontrado.' });
  if (r.status === 'cancelled' || r.status === 'delivered') throw new Recusa(409, { geral: 'Este resgate já foi encerrado.' });

  if (acao === 'cancelar') {
    await estornar(r, equipeId, texto);
    const premio = (await obter('Rewards', String(r.rewardId), { consistentRead: true })) as Item | null;
    if (premio && premio.stock != null && premio.stock !== '') await atualizar('Rewards', { ...premio, stock: Number(premio.stock) + 1 });
    return;
  }
  if (acao === 'enviar') {
    if (r.status !== 'requested') throw new Recusa(409, { geral: 'Este resgate já foi enviado.' });
    await atualizar('Redemptions', { ...r, status: 'shipped', trackingCode: texto || undefined, updatedByMemberId: equipeId });
    return;
  }
  await atualizar('Redemptions', { ...r, status: 'delivered', updatedByMemberId: equipeId });
}
