// POST /api/clube/anexo { researcherId, atividade, tipo, tamanho } — o responsável
// pede um endereço para subir UM arquivo (boletim ou produção). O servidor
// confere a criança, as autorizações e o arquivo, e devolve um endereço de envio
// para um arquivo PRIVADO na mídia do Wix (src/clube/anexos.ts).
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, Recusa } from '../../../clube/servidor';
import { conferirEnvio } from '../../../clube/pontos';
import { enderecoDeEnvio } from '../../../clube/anexos';
import { anexoDa } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();
    const c = await lerJson(request);
    const researcherId = typeof c?.researcherId === 'string' ? c.researcherId : '';
    const chave = String(c?.atividade ?? '');
    const mime = String(c?.tipo ?? '');
    const tamanho = Number(c?.tamanho);
    if (!/^[0-9a-f-]{36}$/i.test(researcherId) || !Number.isSafeInteger(tamanho)) return json({ erros: { geral: 'Pedido inválido.' } }, 400);
    const a = await conferirEnvio(membro.id, researcherId, chave);
    const tipo = anexoDa(a);
    if (!tipo) return json({ erros: { 'registro.arquivo': 'Esta atividade não recebe arquivo.' } }, 400);
    const r = await enderecoDeEnvio(researcherId, tipo, mime, tamanho);
    if ('erro' in r) return json({ erros: { 'registro.arquivo': r.erro } }, 422);
    return json(r);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
