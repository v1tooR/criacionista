// GET /api/loja/premios — PÚBLICO: os prêmios disponíveis para a vitrine da Loja.
// Só nome, descrição, foto, pontos e se está esgotado (nada de dado pessoal).
// A coleção Rewards é ADMIN; a leitura sobe de permissão no servidor e devolve
// apenas estes campos.
import type { APIRoute } from 'astro';
import { FALHA } from '../../../clube/http';
import { listarPremios } from '../../../clube/resgate';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const premios = (await listarPremios()).map(({ nome, descricao, foto, pontos, esgotado }) => ({ nome, descricao, foto, pontos, esgotado }));
    return new Response(JSON.stringify({ premios }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    return FALHA(e);
  }
};
