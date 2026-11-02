// GET  /api/equipe/sugestoes — sugestões de apelido esperando a equipe.
// POST /api/equipe/sugestoes { id, decisao: 'aprovar'|'recusar', observacao } —
// aprovar põe o nome na lista do clube e troca o apelido da criança.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { decidirSugestao, filaSugestoes } from '../../../clube/apelidos';
import { Recusa } from '../../../clube/recusa';
import { limpa } from '../../../clube/regras';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    return json({ sugestoes: await filaSugestoes() });
  } catch (e) {
    return FALHA(e);
  }
};

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
    if (decisao === 'recusar' && observacao.length < 5) return json({ erros: { geral: 'Para recusar, escreva o motivo: o responsável vai ler.' } }, 422);
    await decidirSugestao(eq.id, id, decisao === 'aprovar', observacao);
    return json({ sugestoes: await filaSugestoes() });
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
