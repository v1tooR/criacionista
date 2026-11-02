// GET /api/clube/premios — prêmios disponíveis e o último endereço de entrega
// usado por ESTE responsável (para não digitar de novo). Só para quem está logado.
import type { APIRoute } from 'astro';
import { json, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado } from '../../../clube/servidor';
import { listarPremios, ultimoEndereco } from '../../../clube/resgate';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const [premios, endereco] = await Promise.all([listarPremios(), ultimoEndereco(membro.id)]);
    return json({ premios, endereco });
  } catch (e) {
    return FALHA(e);
  }
};
