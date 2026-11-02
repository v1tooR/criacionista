/**
 * Regras do cadastro do membro pesquisador — as MESMAS no navegador (para
 * avisar cedo) e no servidor (que é quem decide; o navegador nunca é confiável).
 *
 * O que pedimos segue a página Como funciona e a Política de privacidade (§4):
 *   responsável: nome completo, CPF (sempre do adulto), telefone opcional;
 *   criança: primeiro nome, ano de nascimento, apelido e avatar ilustrado.
 * Nunca: CPF, RG ou documento da criança, foto, endereço, escola.
 */

import { atividade as buscarAtividade, responsavelPodeRegistrar, MEDIA_MINIMA } from './atividades';

export const VERSAO_TERMOS = 'termos-2026-10-22';

/** Os textos que o responsável marca. Ficam gravados como foram aceitos. */
export const TERMOS = {
  participacao:
    'Sou mãe, pai ou responsável legal por esta criança, tenho 18 anos ou mais e autorizo a participação dela no Clube Criacionista de Ciências e o tratamento dos dados informados aqui, conforme a Política de privacidade.',
  imagem:
    'Autorizo o envio de fotos e vídeos das descobertas para a equipe do clube avaliar. Sei que o rosto da criança não deve aparecer e que nenhuma imagem será publicada sem uma autorização específica minha.',
} as const;
export type TipoAutorizacao = keyof typeof TERMOS;

export const RELACOES: Record<string, string> = {
  mae: 'Mãe', pai: 'Pai', avo: 'Avó ou avô', tio: 'Tia ou tio',
  responsavel_legal: 'Responsável legal', outro: 'Outro responsável',
};

export const AVATARES = ['atomo', 'lupa', 'telescopio', 'folha', 'planeta', 'foguete', 'borboleta', 'fossil'] as const;

/** Faixa do clube: 9 a 13 anos. Aceita um ano de folga de cada lado (aniversário no meio do ano). */
export function anosPermitidos(hoje = new Date()): number[] {
  const a = hoje.getFullYear();
  const lista: number[] = [];
  for (let y = a - 14; y <= a - 8; y++) lista.push(y);
  return lista.reverse();
}

export const MAX_CRIANCAS = 6;

/* ---------- normalização ---------- */
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const limpa = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
/** Chave do apelido para conferir se é único: sem acento, minúsculo, sem espaço. */
export const chaveApelido = (s: string) => semAcento(limpa(s)).toLowerCase().replace(/[^a-z0-9]/g, '');

/** CPF com os dois dígitos verificadores certos (só números, 11 dígitos, não repetido). */
export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/* ---------- validação ---------- */
export interface DadosResponsavel { nome: string; cpf: string; telefone: string }
export interface DadosCrianca { relacao: string; primeiroNome: string; anoNascimento: number; apelido: string; avatar: string }
export interface DadosCadastro {
  responsavel?: DadosResponsavel;
  crianca: DadosCrianca;
  autorizacoes: { participacao: boolean; imagem: boolean };
  versaoTermos: string;
}
export type Erros = Record<string, string>;

const NOME = /^[\p{L}][\p{L}' .-]*$/u;

export function validarResponsavel(r: Partial<DadosResponsavel> | undefined): Erros {
  const e: Erros = {};
  const nome = limpa(r?.nome);
  if (nome.split(' ').length < 2 || nome.length < 5 || nome.length > 120 || !NOME.test(nome)) e['responsavel.nome'] = 'Informe seu nome completo.';
  if (!cpfValido(String(r?.cpf ?? ''))) e['responsavel.cpf'] = 'Confira o CPF: os números não batem.';
  const tel = String(r?.telefone ?? '').replace(/\D/g, '');
  if (tel && (tel.length < 10 || tel.length > 13)) e['responsavel.telefone'] = 'Informe o telefone com DDD, ou deixe em branco.';
  return e;
}

export function validarCrianca(c: Partial<DadosCrianca> | undefined, hoje = new Date()): Erros {
  const e: Erros = {};
  if (!c?.relacao || !RELACOES[c.relacao]) e['crianca.relacao'] = 'Escolha a sua relação com a criança.';
  const nome = limpa(c?.primeiroNome);
  if (nome.length < 2 || nome.length > 40 || nome.includes(' ') || !NOME.test(nome)) e['crianca.primeiroNome'] = 'Informe só o primeiro nome da criança.';
  if (!anosPermitidos(hoje).includes(Number(c?.anoNascimento))) e['crianca.anoNascimento'] = 'Escolha o ano de nascimento. O clube é para crianças de 9 a 13 anos.';
  const apelido = limpa(c?.apelido);
  const chave = chaveApelido(apelido);
  if (apelido.length < 3 || apelido.length > 20 || !/^[\p{L}\p{N} ]+$/u.test(apelido) || chave.length < 3) {
    e['crianca.apelido'] = 'O apelido precisa ter de 3 a 20 letras ou números.';
  } else if (nome.length >= 3 && chave.includes(chaveApelido(nome))) {
    e['crianca.apelido'] = 'O apelido não pode ter o nome da criança. No clube ela aparece só pelo apelido.';
  }
  if (!c?.avatar || !(AVATARES as readonly string[]).includes(c.avatar)) e['crianca.avatar'] = 'Escolha um avatar.';
  return e;
}

export function validarCadastro(d: Partial<DadosCadastro>, precisaResponsavel: boolean, hoje = new Date()): Erros {
  const e: Erros = {
    ...(precisaResponsavel ? validarResponsavel(d.responsavel) : {}),
    ...validarCrianca(d.crianca, hoje),
  };
  if (d.autorizacoes?.participacao !== true) e['autorizacoes.participacao'] = 'Para inscrever, é preciso marcar esta autorização.';
  if (d.versaoTermos !== VERSAO_TERMOS) e['geral'] = 'Os termos mudaram desde que você abriu a página. Recarregue e confira de novo.';
  return e;
}

/* ---------- registro de atividade (passo 4b) ---------- */

export interface DetalheRegistro {
  evento?: string;     // participação: nome da palestra, oficina, curso…
  data?: string;       // participação: AAAA-MM-DD
  link?: string;       // participação online: link opcional
  ano?: number;        // desempenho
  bimestre?: number;   // desempenho por bimestre: 1 a 4
  media?: number;      // desempenho: 0 a 10
}
export interface DadosRegistro { researcherId: string; atividade: string; detalhe: DetalheRegistro }

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const diaUTC = (d: Date) => d.toISOString().slice(0, 10);

/** Chave que impede registrar a MESMA coisa duas vezes para a mesma criança. */
export function chaveRegistro(d: DadosRegistro): string {
  const det = d.detalhe;
  if (d.atividade === 'media_bimestre') return 'media_bimestre:' + det.ano + '-' + det.bimestre;
  if (d.atividade === 'media_ano') return 'media_ano:' + det.ano;
  return d.atividade + ':' + det.data + ':' + chaveApelido(String(det.evento ?? ''));
}

/** Valida o registro feito pelo RESPONSÁVEL. A equipe usa validarLancamento. */
export function validarRegistro(d: Partial<DadosRegistro>, hoje = new Date()): Erros {
  const e: Erros = {};
  const a = buscarAtividade(String(d.atividade ?? ''));
  if (!a || !responsavelPodeRegistrar(a)) { e['registro.atividade'] = 'Escolha uma atividade da lista.'; return e; }
  return { ...e, ...validarDetalhe(a.area, a.chave, d.detalhe ?? {}, hoje) };
}

export function validarDetalhe(area: string, chave: string, det: DetalheRegistro, hoje = new Date()): Erros {
  const e: Erros = {};
  if (area === 'participacao') {
    const evento = limpa(det.evento);
    if (evento.length < 3 || evento.length > 120) e['registro.evento'] = 'Diga qual foi a atividade (nome da palestra, oficina, curso…).';
    const data = String(det.data ?? '');
    const umAnoAtras = new Date(hoje); umAnoAtras.setUTCFullYear(umAnoAtras.getUTCFullYear() - 1);
    if (!ISO_DIA.test(data) || data > diaUTC(hoje) || data < diaUTC(umAnoAtras)) e['registro.data'] = 'Informe a data (dos últimos 12 meses, sem data futura).';
    const link = limpa(det.link);
    if (link && (!/^https:\/\/[^\s]+$/i.test(link) || link.length > 300)) e['registro.link'] = 'O link precisa começar com https://, ou deixe em branco.';
  } else if (area === 'desempenho') {
    const ano = Number(det.ano), y = hoje.getFullYear();
    if (ano !== y && ano !== y - 1) e['registro.ano'] = 'Escolha o ano letivo (este ou o anterior).';
    if (chave === 'media_bimestre' && ![1, 2, 3, 4].includes(Number(det.bimestre))) e['registro.bimestre'] = 'Escolha o bimestre.';
    const media = Number(det.media);
    if (!Number.isFinite(media) || media < 0 || media > 10) e['registro.media'] = 'Informe a média, de 0 a 10 (ex.: 8,5).';
    else if (media < MEDIA_MINIMA) e['registro.media'] = 'Os pontos valem para média 8,0 ou maior.';
  } else {
    e['registro.atividade'] = 'Esta atividade ainda não aceita registro pelo site.';
  }
  return e;
}

/** Só o que interessa de cada área é guardado (nada de campo extra vindo do navegador). */
export function detalheLimpo(area: string, chave: string, det: DetalheRegistro): DetalheRegistro {
  if (area === 'participacao') return { evento: limpa(det.evento), data: String(det.data), ...(limpa(det.link) ? { link: limpa(det.link) } : {}) };
  return { ano: Number(det.ano), ...(chave === 'media_bimestre' ? { bimestre: Number(det.bimestre) } : {}), media: Math.round(Number(det.media) * 10) / 10 };
}

/* ---------- resgate: endereço de entrega (Correios) ---------- */
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export interface Endereco {
  destinatario: string; cep: string; logradouro: string; numero: string;
  complemento: string; bairro: string; cidade: string; uf: string;
}

export function enderecoLimpo(e: Partial<Endereco> | undefined): Endereco {
  return {
    destinatario: limpa(e?.destinatario), cep: String(e?.cep ?? '').replace(/\D/g, ''),
    logradouro: limpa(e?.logradouro), numero: limpa(e?.numero), complemento: limpa(e?.complemento),
    bairro: limpa(e?.bairro), cidade: limpa(e?.cidade), uf: limpa(e?.uf).toUpperCase(),
  };
}

export function validarEndereco(bruto: Partial<Endereco> | undefined): Erros {
  const e: Erros = {};
  const x = enderecoLimpo(bruto);
  if (x.destinatario.split(' ').length < 2 || x.destinatario.length > 120) e['entrega.destinatario'] = 'Nome completo de quem vai receber.';
  if (x.cep.length !== 8) e['entrega.cep'] = 'CEP com 8 números.';
  if (x.logradouro.length < 3 || x.logradouro.length > 150) e['entrega.logradouro'] = 'Informe a rua, avenida…';
  if (!x.numero || x.numero.length > 15) e['entrega.numero'] = 'Informe o número (ou "s/n").';
  if (x.complemento.length > 80) e['entrega.complemento'] = 'Complemento muito longo.';
  if (x.bairro.length < 2 || x.bairro.length > 80) e['entrega.bairro'] = 'Informe o bairro.';
  if (x.cidade.length < 2 || x.cidade.length > 80) e['entrega.cidade'] = 'Informe a cidade.';
  if (!UFS.includes(x.uf)) e['entrega.uf'] = 'Escolha o estado.';
  return e;
}
