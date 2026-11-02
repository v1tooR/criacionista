// POST /api/clube/registrar { researcherId, atividade, detalhe } — o responsável
// registra uma atividade da criança; fica "em análise" até a equipe conferir.
// Os pontos NÃO vêm daqui: saem do catálogo, na aprovação.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, montarPainel, Recusa } from '../../../clube/servidor';
import { registrar } from '../../../clube/pontos';
import { validarRegistro, type DadosRegistro } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const c = await lerJson(request);
    const det = c?.detalhe && typeof c.detalhe === 'object' ? c.detalhe : {};
    const dados: DadosRegistro = {
      researcherId: typeof c?.researcherId === 'string' ? c.researcherId : '',
      atividade: String(c?.atividade ?? ''),
      detalhe: {
        evento: typeof det.evento === 'string' ? det.evento : undefined,
        data: typeof det.data === 'string' ? det.data : undefined,
        link: typeof det.link === 'string' ? det.link : undefined,
        ano: det.ano != null ? Number(det.ano) : undefined,
        bimestre: det.bimestre != null ? Number(det.bimestre) : undefined,
        media: det.media != null ? Number(det.media) : undefined,
        titulo: typeof det.titulo === 'string' ? det.titulo : undefined,
        texto: typeof det.texto === 'string' ? det.texto : undefined,
        arquivo: typeof det.arquivo === 'string' ? det.arquivo : undefined,
      },
    };
    if (!/^[0-9a-f-]{36}$/i.test(dados.researcherId)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const erros = validarRegistro(dados);
    if (Object.keys(erros).length) return json({ erros }, 422);
    await registrar(membro.id, dados);
    return json(await montarPainel(membro.id), 201);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
