// POST /api/equipe/lancar { apelido, atividade, detalhe: { evento, data } } — só equipe.
// Presença conferida (credenciamento da palestra, oficina…): cria o registro já
// aprovado e credita. Mesma trava anti-repetição do registro do responsável.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { lancar } from '../../../clube/pontos';
import { Recusa } from '../../../clube/recusa';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    const c = await lerJson(request);
    const det = c?.detalhe && typeof c.detalhe === 'object' ? c.detalhe : {};
    const apelido = typeof c?.apelido === 'string' ? c.apelido : '';
    if (!apelido.trim()) return json({ erros: { 'lancar.apelido': 'Informe o apelido do membro pesquisador.' } }, 422);
    const r = await lancar(eq.id, apelido, String(c?.atividade ?? ''), {
      evento: typeof det.evento === 'string' ? det.evento : undefined,
      data: typeof det.data === 'string' ? det.data : undefined,
      link: typeof det.link === 'string' ? det.link : undefined,
    });
    return json(r, 201);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
