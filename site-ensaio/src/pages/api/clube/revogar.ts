// POST /api/clube/revogar { researcherId, tipo } — o responsável retira uma
// autorização. Só vale para criança vinculada a ELE (conferido no servidor).
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, revogar, Recusa } from '../../../clube/servidor';
import { TERMOS, type TipoAutorizacao } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const corpo = await lerJson(request);
    const researcherId = typeof corpo?.researcherId === 'string' ? corpo.researcherId : '';
    const tipo = String(corpo?.tipo ?? '') as TipoAutorizacao;
    if (!/^[0-9a-f-]{36}$/i.test(researcherId) || !(tipo in TERMOS)) {
      return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    }
    return json(await revogar(membro.id, researcherId, tipo));
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
