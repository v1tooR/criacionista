// POST /api/equipe/decidir { id, decisao: 'aprovar'|'recusar', observacao } — só equipe.
// Recusar exige observação: é o que o responsável lê para entender o motivo.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { decidir, filaEquipe } from '../../../clube/pontos';
import { Recusa } from '../../../clube/recusa';
import { limpa } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    const c = await lerJson(request);
    const id = typeof c?.id === 'string' ? c.id : '';
    const decisao = c?.decisao;
    const observacao = limpa(c?.observacao).slice(0, 500);
    if (!/^[0-9a-f-]{36}$/i.test(id) || (decisao !== 'aprovar' && decisao !== 'recusar')) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    if (decisao === 'recusar' && observacao.length < 5) return json({ erros: { observacao: 'Diga ao responsável o motivo da recusa.' } }, 422);
    await decidir(eq.id, id, decisao === 'aprovar', observacao);
    return json({ fila: await filaEquipe() });
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
