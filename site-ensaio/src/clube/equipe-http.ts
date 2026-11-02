/**
 * Portaria das rotas da equipe (src/pages/api/equipe/*): além do login, o
 * membro precisa estar ATIVO na coleção TeamMembers. Quem não está recebe 403
 * antes de qualquer leitura — inclusive a fila, que só mostra apelidos.
 */
import { json, NAO_LOGADO } from './http';
import { membroLogado } from './servidor';
import { ehEquipe } from './pontos';

export async function exigirEquipe(): Promise<{ id: string } | Response> {
  const membro = await membroLogado();
  if (!membro) return NAO_LOGADO();
  if (!(await ehEquipe(membro.id))) return json({ erros: { geral: 'Esta área é só da equipe do clube.' } }, 403);
  return { id: membro.id };
}
