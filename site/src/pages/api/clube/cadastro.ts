// POST /api/clube/cadastro — inscreve um membro pesquisador no cadastro do
// responsável logado (e cria o responsável, na primeira vez).
// O servidor valida tudo de novo: o que o navegador conferiu é só cortesia.
import type { APIRoute } from 'astro';
import { json, lerJson, recusaOrigem, NAO_LOGADO, FALHA } from '../../../clube/http';
import { membroLogado, cadastrar, montarPainel, Recusa } from '../../../clube/servidor';
import { validarCadastro, type DadosCadastro } from '../../../clube/regras';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const barrada = recusaOrigem(request);
  if (barrada) return barrada;
  try {
    const membro = await membroLogado();
    if (!membro) return NAO_LOGADO();

    const corpo = await lerJson(request);
    if (!corpo) return json({ erros: { geral: 'Formato inválido.' } }, 400);

    // só os campos esperados, com os tipos esperados — o resto é ignorado
    const r = corpo.responsavel && typeof corpo.responsavel === 'object' ? corpo.responsavel : undefined;
    const c = corpo.crianca && typeof corpo.crianca === 'object' ? corpo.crianca : {};
    const a = corpo.autorizacoes && typeof corpo.autorizacoes === 'object' ? corpo.autorizacoes : {};
    const dados: DadosCadastro = {
      responsavel: r ? { nome: String(r.nome ?? ''), cpf: String(r.cpf ?? ''), telefone: String(r.telefone ?? '') } : undefined,
      crianca: {
        relacao: String(c.relacao ?? ''), primeiroNome: String(c.primeiroNome ?? ''),
        anoNascimento: Number(c.anoNascimento), apelido: String(c.apelido ?? ''), avatar: String(c.avatar ?? ''),
      },
      autorizacoes: { participacao: a.participacao === true, imagem: a.imagem === true },
      versaoTermos: String(corpo.versaoTermos ?? ''),
    };

    const jaTemResponsavel = (await montarPainel(membro.id)).responsavel !== null;
    const erros = validarCadastro(dados, !jaTemResponsavel);
    if (Object.keys(erros).length) return json({ erros }, 422);

    const evidencia = { userAgent: (request.headers.get('user-agent') || '').slice(0, 300), via: 'site/cadastro' };
    return json(await cadastrar(membro, dados, evidencia), 201);
  } catch (e) {
    if (e instanceof Recusa) return json({ erros: e.erros }, e.status);
    return FALHA(e);
  }
};
