// POST /api/clube/autorizar { researcherId, versaoTermos } — o responsável dá a
// autorização de imagem depois da inscrição (pelo painel). Só para criança
// vinculada a ELE, conferido no servidor.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, autorizarImagem, Recusa } from '../../../clube/servidor';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const corpo = await lerJson(request);
    const researcherId = typeof corpo?.researcherId === 'string' ? corpo.researcherId : '';
    if (!/^[0-9a-f-]{36}$/i.test(researcherId)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const evidencia = { userAgent: (request.headers.get('user-agent') || '').slice(0, 300), via: 'site/painel' };
    return json(await autorizarImagem(membro, researcherId, String(corpo?.versaoTermos ?? ''), evidencia));
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
