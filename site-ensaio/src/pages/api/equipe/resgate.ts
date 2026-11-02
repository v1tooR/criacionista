// POST /api/equipe/resgate { id, acao: 'enviar'|'entregar'|'cancelar', texto } — só equipe.
// enviar: texto = código de rastreio (opcional). cancelar: texto = motivo (obrigatório);
// devolve os pontos ao extrato e o item ao estoque.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { atualizarResgate, filaResgates } from '../../../clube/resgate';
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
    const acao = c?.acao;
    const texto = limpa(c?.texto).slice(0, 200);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['enviar', 'entregar', 'cancelar'].includes(acao)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    if (acao === 'cancelar' && texto.length < 5) return json({ erros: { geral: 'Para cancelar, escreva o motivo: o responsável vai ler.' } }, 422);
    await atualizarResgate(eq.id, id, acao, texto);
    return json({ resgates: await filaResgates() });
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
