// GET /api/equipe/fila — registros esperando conferência (só equipe).
import type { APIRoute } from 'astro';
import { json, FALHA } from '../../../clube/http';
import { exigirEquipe } from '../../../clube/equipe-http';
import { filaEquipe } from '../../../clube/pontos';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const eq = await exigirEquipe();
    if (eq instanceof Response) return eq;
    return json({ fila: await filaEquipe() });
  } catch (e) {
    return FALHA(e);
  }
};
