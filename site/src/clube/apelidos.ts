/**
 * Apelidos dos membros pesquisadores. SÓ NO SERVIDOR.
 *
 * Pedido do cliente (26/10/2026): a criança escolhe o apelido numa lista de
 * cientistas e personalidades ligadas ao tema das origens. Se o nome já foi
 * escolhido, ela recebe o mesmo nome com número: Newton, Newton001, Newton002…
 * Quem quiser um nome fora da lista sugere, com uma pesquisa sobre a pessoa;
 * se a equipe aprovar, o nome entra na lista e a criança passa a usá-lo.
 *
 * AliasNames      a lista. A equipe edita pelo painel do Wix (CMS → "Apelidos").
 * AliasSuggestions  as sugestões, com a pesquisa enviada.
 * As duas são ADMIN nas 4 permissões, como as outras do clube.
 */
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { Recusa } from './recusa';
import { apelidoNumerado, chaveApelido, limpa, type DadosSugestao } from './regras';

const consultar = auth.elevate(items.query);
const inserir = auth.elevate(items.insert);
const atualizar = auth.elevate(items.update);
const obter = auth.elevate(items.get);

type Item = Record<string, any> & { _id: string };

async function buscar(colecao: string, filtro: Record<string, unknown>, limite = 50): Promise<Item[]> {
  const r = await consultar(colecao, { filter: filtro, cursorPaging: { limit: limite } }, { consistentRead: true });
  return (r.items ?? []) as Item[];
}

export interface ApelidoDaLista { apelido: string; nome: string; nascimento: string; local: string; fatos: string; proximo: string }

/** Chaves de apelido já em uso (o clube é pequeno: cabe numa consulta). */
async function chavesOcupadas(): Promise<Set<string>> {
  const r = await consultar('Researchers', { cursorPaging: { limit: 1000 } }, { consistentRead: true });
  return new Set(((r.items ?? []) as Item[]).map((x) => String(x.aliasKey)));
}

/** O primeiro apelido livre para este nome: o próprio, ou com 001, 002… */
function proximoLivre(base: string, ocupadas: Set<string>): string {
  for (let n = 0; n < 1000; n++) {
    const tentativa = apelidoNumerado(base, n);
    if (!ocupadas.has(chaveApelido(tentativa))) return tentativa;
  }
  throw new Recusa(409, { 'crianca.apelido': 'Este nome já foi escolhido muitas vezes. Escolha outro.' });
}

export async function listarApelidos(): Promise<ApelidoDaLista[]> {
  const r = await consultar('AliasNames', { filter: { active: true }, sort: [{ fieldName: 'name', order: 'ASC' }], cursorPaging: { limit: 500 } }, { consistentRead: true });
  const ocupadas = await chavesOcupadas();
  return ((r.items ?? []) as Item[]).map((x) => ({
    apelido: String(x.alias), nome: String(x.name), nascimento: String(x.born ?? ''), local: String(x.birthplace ?? ''),
    fatos: String(x.facts ?? ''), proximo: proximoLivre(String(x.alias), ocupadas),
  }));
}

/** Confere que o nome escolhido está na lista e devolve o apelido final (com número, se preciso). */
export async function atribuirApelido(escolhido: string): Promise<{ alias: string; aliasKey: string }> {
  const chave = chaveApelido(escolhido);
  const [daLista] = await buscar('AliasNames', { aliasKey: chave, active: true }, 1);
  if (!daLista) throw new Recusa(422, { 'crianca.apelido': 'Escolha um nome da lista.' });
  const alias = proximoLivre(String(daLista.alias), await chavesOcupadas());
  return { alias, aliasKey: chaveApelido(alias) };
}

/**
 * Depois de gravar: se duas inscrições pegaram o mesmo número ao mesmo tempo,
 * a mais nova passa para o próximo livre.
 */
export async function desempatar(crianca: Item, base: string): Promise<Item> {
  const iguais = await buscar('Researchers', { aliasKey: crianca.aliasKey }, 5);
  if (iguais.length < 2) return crianca;
  const primeiro = iguais.sort((a, b) => String(a._createdDate).localeCompare(String(b._createdDate)))[0];
  if (primeiro._id === crianca._id) return crianca;
  const alias = proximoLivre(base, await chavesOcupadas());
  return (await atualizar('Researchers', { ...crianca, alias, aliasKey: chaveApelido(alias) })) as Item;
}

/* ---------- sugestão de nome que não está na lista ---------- */

export interface SugestaoPainel { situacao: string; apelido: string; nome: string; observacao: string }

export async function sugestaoDaCrianca(researcherId: string): Promise<SugestaoPainel | null> {
  const r = await consultar('AliasSuggestions', { filter: { researcherId }, sort: [{ fieldName: 'requestedAt', order: 'DESC' }], cursorPaging: { limit: 1 } }, { consistentRead: true });
  const s = (r.items ?? [])[0] as Item | undefined;
  return s ? { situacao: String(s.status), apelido: String(s.alias), nome: String(s.name), observacao: String(s.reviewNotes ?? '') } : null;
}

export async function sugerir(memberId: string, d: DadosSugestao): Promise<void> {
  const [vinculo] = await buscar('GuardianLinks', { guardianMemberId: memberId, researcherId: d.researcherId, status: 'active' }, 1);
  if (!vinculo) throw new Recusa(404, { geral: 'Membro pesquisador não encontrado neste cadastro.' });
  if ((await buscar('AliasSuggestions', { researcherId: d.researcherId, status: 'pending' }, 1)).length) {
    throw new Recusa(409, { geral: 'Já existe uma sugestão esperando a equipe. Aguarde a resposta.' });
  }
  const alias = limpa(d.apelido);
  const aliasKey = chaveApelido(alias);
  if ((await buscar('AliasNames', { aliasKey }, 1)).length) {
    throw new Recusa(409, { 'sugestao.apelido': 'Esse nome já está na lista do clube.' });
  }
  await inserir('AliasSuggestions', {
    researcherId: d.researcherId, name: limpa(d.nome), alias, aliasKey, research: String(d.pesquisa).trim(),
    status: 'pending', requestedByMemberId: memberId, requestedAt: new Date(),
  });
}

export interface SugestaoFila { id: string; apelidoAtual: string; avatar: string; nome: string; apelido: string; pesquisa: string; data: string }

export async function filaSugestoes(): Promise<SugestaoFila[]> {
  const r = await consultar('AliasSuggestions', { filter: { status: 'pending' }, sort: [{ fieldName: 'requestedAt', order: 'ASC' }], cursorPaging: { limit: 100 } }, { consistentRead: true });
  const out: SugestaoFila[] = [];
  for (const s of (r.items ?? []) as Item[]) {
    const c = (await obter('Researchers', String(s.researcherId), { consistentRead: true })) as Item | null;
    out.push({
      id: s._id, apelidoAtual: c?.alias ?? '(removido)', avatar: c?.avatar ?? '', nome: String(s.name), apelido: String(s.alias),
      pesquisa: String(s.research), data: new Date(s.requestedAt ?? s._createdDate).toISOString(),
    });
  }
  return out;
}

/** Aprovar: o nome entra na lista e a criança passa a usá-lo (com número, se já houver). */
export async function decidirSugestao(equipeId: string, id: string, aprovar: boolean, observacao: string): Promise<void> {
  const s = (await obter('AliasSuggestions', id, { consistentRead: true })) as Item | null;
  if (!s) throw new Recusa(404, { geral: 'Sugestão não encontrada.' });
  if (s.status !== 'pending') throw new Recusa(409, { geral: 'Esta sugestão já foi decidida.' });
  const fim = { reviewedByMemberId: equipeId, reviewedAt: new Date(), ...(observacao ? { reviewNotes: observacao } : {}) };
  if (!aprovar) {
    await atualizar('AliasSuggestions', { ...s, status: 'rejected', ...fim });
    return;
  }
  if (!(await buscar('AliasNames', { aliasKey: s.aliasKey }, 1)).length) {
    await inserir('AliasNames', {
      name: s.name, alias: s.alias, aliasKey: s.aliasKey, facts: '', source: 'sugestao', active: true,
      suggestedByResearcherId: s.researcherId,
    });
  }
  const c = (await obter('Researchers', String(s.researcherId), { consistentRead: true })) as Item | null;
  let novo = '';
  if (c) {
    novo = proximoLivre(String(s.alias), await chavesOcupadas());
    await atualizar('Researchers', { ...c, alias: novo, aliasKey: chaveApelido(novo) });
  }
  await atualizar('AliasSuggestions', { ...s, status: 'approved', assignedAlias: novo, ...fim });
}
