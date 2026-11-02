// GET /api/clube/apelidos — a lista de nomes do clube, com o apelido que sairia
// se escolhido agora (Newton, ou Newton001 se já estiver em uso). Só logado:
// quem chega aqui está inscrevendo uma criança.
import type { APIRoute } from 'astro';
import { json, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado } from '../../../clube/servidor';
import { listarApelidos } from '../../../clube/apelidos';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    if (!(await membroLogado())) return NAO_LOGADO();
    return json({ apelidos: await listarApelidos() });
  } catch (e) {
    return FALHA(e);
  }
};
