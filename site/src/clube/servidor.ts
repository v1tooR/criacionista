/**
 * Acesso às coleções do cadastro — SÓ NO SERVIDOR (src/pages/api/clube/*).
 *
 * As coleções Guardians, Researchers, GuardianLinks e Authorizations são
 * ADMIN nas quatro permissões (scripts/cria-colecoes.mjs): o navegador não lê
 * nem grava nada nelas. Aqui as chamadas sobem de permissão com auth.elevate,
 * e por isso cada função recebe o memberId JÁ CONFERIDO pelo servidor
 * (membroLogado), nunca um id vindo do navegador.
 *
 * SDK: @wix/data items.query/insert/update e @wix/essentials auth.elevate,
 * no formato da doc oficial (dev.wix.com/docs/api-reference/business-solutions/cms/data-items).
 */
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { fetchCurrentMember } from '../wix/members/members';
import type { CurrentMember } from '../wix/members/types';
import {
  MAX_CRIANCAS, TERMOS, VERSAO_TERMOS, limpa,
  type DadosCadastro, type TipoAutorizacao,
} from './regras';
import { Recusa } from './recusa';
import { pontosDaCrianca, ehEquipe, type PontosCrianca } from './pontos';
import { atribuirApelido, desempatar, sugestaoDaCrianca, type SugestaoPainel } from './apelidos';

const consultar = auth.elevate(items.query);
const inserir = auth.elevate(items.insert);
const atualizar = auth.elevate(items.update);
const obter = auth.elevate(items.get);

type Item = Record<string, any> & { _id: string };

async function buscar(colecao: string, filtro: Record<string, unknown>, limite = 50): Promise<Item[]> {
  const r = await consultar(colecao, { filter: filtro, cursorPaging: { limit: limite } }, { consistentRead: true });
  return (r.items ?? []) as Item[];
}

/** O membro desta requisição, lido da sessão no servidor. null = não logado. */
export async function membroLogado(): Promise<CurrentMember | null> {
  return fetchCurrentMember();
}

/* ---------- o que o painel mostra ---------- */
export interface CriancaPainel {
  id: string;
  apelido: string;
  primeiroNome: string;
  avatar: string;
  situacao: string;
  autorizacoes: Record<TipoAutorizacao, 'aceita' | 'revogada' | 'nao_dada'>;
  pontos: PontosCrianca;
  /** a última sugestão de apelido fora da lista, se houver */
  sugestao: SugestaoPainel | null;
}
export interface Painel {
  responsavel: { nome: string } | null;
  criancas: CriancaPainel[];
  /** o membro é da equipe: a página mostra o atalho para o painel de aprovação */
  equipe: boolean;
}

export async function montarPainel(memberId: string): Promise<Painel> {
  const [resp] = await buscar('Guardians', { memberId }, 1);
  const equipe = await ehEquipe(memberId);
  if (!resp) return { responsavel: null, criancas: [], equipe };
  const vinculos = await buscar('GuardianLinks', { guardianMemberId: memberId, status: 'active' });
  const criancas: CriancaPainel[] = [];
  for (const v of vinculos) {
    const r = await obter('Researchers', String(v.researcherId), { consistentRead: true });
    if (!r) continue;
    const auts = await buscar('Authorizations', { researcherId: r._id, guardianMemberId: memberId });
    const situacaoDe = (tipo: TipoAutorizacao) => {
      const a = auts.filter((x) => x.authorizationType === tipo).sort((x, y) => String(y._createdDate).localeCompare(String(x._createdDate)))[0];
      return !a ? 'nao_dada' : a.status === 'accepted' ? 'aceita' : 'revogada';
    };
    criancas.push({
      id: r._id, apelido: r.alias, primeiroNome: r.firstName, avatar: r.avatar, situacao: r.status,
      autorizacoes: { participacao: situacaoDe('participacao'), imagem: situacaoDe('imagem') },
      pontos: await pontosDaCrianca(r._id),
      sugestao: await sugestaoDaCrianca(r._id),
    });
  }
  return { responsavel: { nome: String(resp.fullName) }, criancas, equipe };
}

/* ---------- cadastro ---------- */
export { Recusa };

/**
 * Grava um cadastro já validado por validarCadastro().
 * Ordem pensada para falha no meio: a criança nasce "pending" e só vira
 * "active" depois que vínculo e autorizações existem.
 */
export async function cadastrar(membro: CurrentMember, d: DadosCadastro, evidencia: Record<string, string>): Promise<Painel> {
  const memberId = membro.id;
  const agora = new Date();

  let [resp] = await buscar('Guardians', { memberId }, 1);
  if (!resp) {
    if (!d.responsavel) throw new Recusa(400, { geral: 'Faltam os dados do responsável.' });
    const cpf = d.responsavel.cpf.replace(/\D/g, '');
    const outros = await buscar('Guardians', { cpf }, 5);
    if (outros.some((g) => g.memberId !== memberId)) {
      throw new Recusa(409, { 'responsavel.cpf': 'Este CPF já está ligado a outra conta do clube. Fale com a gente pela página de contato.' });
    }
    resp = await inserir<Record<string, any>>('Guardians', {
      memberId, fullName: limpa(d.responsavel.nome), cpf,
      phone: d.responsavel.telefone.replace(/\D/g, '') || undefined,
      email: membro.loginEmail || undefined, status: 'active',
    }) as Item;
  }

  const vinculos = await buscar('GuardianLinks', { guardianMemberId: memberId, status: 'active' });
  if (vinculos.length >= MAX_CRIANCAS) {
    throw new Recusa(409, { geral: 'Este cadastro já tem ' + MAX_CRIANCAS + ' membros pesquisadores. Para incluir mais, fale com a gente.' });
  }

  // o apelido vem da lista do clube; se o nome já está em uso, ganha número (Newton001)
  const base = limpa(d.crianca.apelido);
  const { alias, aliasKey } = await atribuirApelido(base);

  let crianca = await inserir<Record<string, any>>('Researchers', {
    alias, aliasKey, firstName: limpa(d.crianca.primeiroNome),
    birthYear: Number(d.crianca.anoNascimento), avatar: d.crianca.avatar, status: 'pending',
  }) as Item;
  crianca = await desempatar(crianca, base);

  await inserir('GuardianLinks', {
    guardianMemberId: memberId, researcherId: crianca._id,
    relationship: d.crianca.relacao, isPrimary: true, status: 'active',
  });

  for (const tipo of Object.keys(TERMOS) as TipoAutorizacao[]) {
    if (!d.autorizacoes[tipo]) continue; // não dada: não há o que registrar
    await inserir('Authorizations', {
      researcherId: crianca._id, guardianMemberId: memberId, authorizationType: tipo,
      status: 'accepted', acceptedAt: agora, documentVersion: VERSAO_TERMOS,
      documentText: TERMOS[tipo], evidence: { ...evidencia, email: membro.loginEmail },
    });
  }

  await atualizar('Researchers', { ...crianca, status: 'active', joinedAt: agora });
  return montarPainel(memberId);
}

/* ---------- autorizar depois (só imagem) ---------- */
/**
 * O responsável que não marcou a autorização de imagem na inscrição pode dar
 * depois, pelo painel. Grava o texto e a versão do dia, como na inscrição.
 * Participação não entra aqui: retirada, ela tira a criança do clube.
 */
export async function autorizarImagem(membro: CurrentMember, researcherId: string, versao: string, evidencia: Record<string, string>): Promise<Painel> {
  if (versao !== VERSAO_TERMOS) throw new Recusa(409, { geral: 'O texto da autorização mudou desde que você abriu a página. Recarregue e confira de novo.' });
  const memberId = membro.id;
  const [vinculo] = await buscar('GuardianLinks', { guardianMemberId: memberId, researcherId, status: 'active' }, 1);
  if (!vinculo) throw new Recusa(404, { geral: 'Membro pesquisador não encontrado neste cadastro.' });
  const ativa = await buscar('Authorizations', { researcherId, guardianMemberId: memberId, authorizationType: 'imagem', status: 'accepted' }, 1);
  if (!ativa.length) {
    await inserir('Authorizations', {
      researcherId, guardianMemberId: memberId, authorizationType: 'imagem',
      status: 'accepted', acceptedAt: new Date(), documentVersion: VERSAO_TERMOS,
      documentText: TERMOS.imagem, evidence: { ...evidencia, email: membro.loginEmail },
    });
  }
  return montarPainel(memberId);
}

/* ---------- revogar ---------- */
export async function revogar(memberId: string, researcherId: string, tipo: TipoAutorizacao): Promise<Painel> {
  const [vinculo] = await buscar('GuardianLinks', { guardianMemberId: memberId, researcherId, status: 'active' }, 1);
  if (!vinculo) throw new Recusa(404, { geral: 'Membro pesquisador não encontrado neste cadastro.' });

  const ativas = await buscar('Authorizations', { researcherId, guardianMemberId: memberId, authorizationType: tipo, status: 'accepted' });
  for (const a of ativas) await atualizar('Authorizations', { ...a, status: 'revoked', revokedAt: new Date() });

  // sem a autorização de participação a criança sai do clube (dados ficam, para o responsável pedir exclusão)
  if (tipo === 'participacao') {
    const r = await obter('Researchers', researcherId, { consistentRead: true });
    if (r && r.status !== 'suspended') await atualizar('Researchers', { ...r, status: 'suspended' });
  }
  return montarPainel(memberId);
}
