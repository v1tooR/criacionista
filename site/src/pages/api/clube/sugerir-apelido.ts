// POST /api/clube/sugerir-apelido { researcherId, nome, apelido, pesquisa } — o
// responsável sugere um nome que não está na lista, com a pesquisa da criança.
// A equipe decide em /equipe; aprovado, o nome entra na lista e vira o apelido.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, montarPainel, Recusa } from '../../../clube/servidor';
import { sugerir } from '../../../clube/apelidos';
import { validarSugestao, type DadosSugestao } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const c = await lerJson(request);
    const dados: DadosSugestao = {
      researcherId: typeof c?.researcherId === 'string' ? c.researcherId : '',
      nome: String(c?.nome ?? ''), apelido: String(c?.apelido ?? ''), pesquisa: String(c?.pesquisa ?? ''),
    };
    if (!/^[0-9a-f-]{36}$/i.test(dados.researcherId)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const erros = validarSugestao(dados);
    if (Object.keys(erros).length) return json({ erros }, 422);
    await sugerir(membro.id, dados);
    return json(await montarPainel(membro.id), 201);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
