// GET /api/equipe/resgates — resgates a enviar e enviados (só equipe).
// Traz o endereço de entrega: é o que a equipe precisa para postar nos Correios.
import type { APIRoute } from 'astro';
import { json, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { filaResgates } from '../../../clube/resgate';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    return json({ resgates: await filaResgates() });
  } catch (e) {
    return FALHA(e);
  }
};
