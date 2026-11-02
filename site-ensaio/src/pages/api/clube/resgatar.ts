// POST /api/clube/resgatar { researcherId, rewardId, entrega } — o responsável
// troca pontos por um prêmio. Preço, estoque e saldo são conferidos no servidor.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, montarPainel, Recusa } from '../../../clube/servidor';
import { resgatar } from '../../../clube/resgate';
import { enderecoLimpo, validarEndereco } from '../../../clube/regras';

export const prerender = false;
const GUID = /^[0-9a-f-]{36}$/i;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const c = await lerJson(request);
    const researcherId = typeof c?.researcherId === 'string' ? c.researcherId : '';
    const rewardId = typeof c?.rewardId === 'string' ? c.rewardId : '';
    if (!GUID.test(researcherId) || !GUID.test(rewardId)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const entrega = c?.entrega && typeof c.entrega === 'object' ? c.entrega : {};
    const erros = validarEndereco(entrega);
    if (Object.keys(erros).length) return json({ erros }, 422);
    await resgatar(membro.id, researcherId, rewardId, enderecoLimpo(entrega));
    return json(await montarPainel(membro.id), 201);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
