// GET /api/clube/painel — o cadastro do membro logado: responsável e crianças
// vinculadas. Nada de outra família; o memberId sai da sessão, não da URL.
import type { APIRoute } from 'astro';
import { json, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, montarPainel } from '../../../clube/servidor';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    return json(await montarPainel(membro.id));
  } catch (e) {
    return FALHA(e);
  }
};
