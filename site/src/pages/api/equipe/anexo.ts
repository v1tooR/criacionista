// POST /api/equipe/anexo { id } — só equipe. Link temporário (10 minutos) para
// abrir o anexo privado de um registro (boletim ou produção).
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { anexoParaEquipe } from '../../../clube/pontos';
import { Recusa } from '../../../clube/recusa';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    const c = await lerJson(request);
    const id = typeof c?.id === 'string' ? c.id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const url = await anexoParaEquipe(id);
    if (!url) return json({ erros: { geral: 'Não foi possível abrir o anexo agora.' } }, 502);
    return json({ url });
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
