/**
 * Regras do cadastro do membro pesquisador — as MESMAS no navegador (para
 * avisar cedo) e no servidor (que é quem decide; o navegador nunca é confiável).
 *
 * O que pedimos segue a página Como funciona e a Política de privacidade (§4):
 *   responsável: nome completo, CPF (sempre do adulto), telefone opcional;
 *   criança: primeiro nome, ano de nascimento, apelido e avatar ilustrado.
 * Nunca: CPF, RG ou documento da criança, foto, endereço, escola.
 * Exceção pedida pelo cliente (26/10/2026): o print do boletim, junto com o
 * registro de média. Fica privado e é apagado assim que a equipe decide.
 */

import { atividade as buscarAtividade, responsavelPodeRegistrar, MEDIA_MINIMA, type Atividade } from './atividades';

// trocou o texto da autorização de imagem (pedido do cliente, 26/10/2026)
export const VERSAO_TERMOS = 'termos-2026-10-26';

/** Os textos que o responsável marca. Ficam gravados como foram aceitos. */
export const TERMOS = {
  participacao:
    'Sou mãe, pai ou responsável legal por esta criança, tenho 18 anos ou mais e autorizo a participação dela no Clube Criacionista de Ciências e o tratamento dos dados informados aqui, conforme a Política de privacidade.',
  // texto do cliente (26/10/2026), só com a gramática acertada
  imagem:
    'Autorizo o uso das fotos e/ou vídeos das atividades realizadas por meu(minha) filho(a) e enviadas para a equipe do clube avaliar e divulgar, se desejar. Sei que o rosto da criança deverá ser borrado por mim nas imagens, caso eu não deseje que ele(a) seja mostrado(a).',
} as const;

/** Aviso mostrado antes de enviar foto ou vídeo (texto do cliente, 26/10/2026). */
export const AVISO_IMAGEM =
  'Caso não deseje mostrar o rosto da criança, borre a imagem que será enviada (atente para não mostrar o seu endereço ou fachada da casa, uniforme escolar ou outro item que não desejar mostrar).';

/**
 * O que cada tipo de anexo aceita. O navegador confere antes de subir, para
 * avisar cedo; o servidor confere de novo ao gerar o endereço de envio.
 */
const MB = 1024 * 1024;
export const ANEXOS = {
  boletim: { tipos: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], max: 10 * MB, rotulo: 'foto ou PDF do boletim' },
  foto: { tipos: ['image/jpeg', 'image/png', 'image/webp'], max: 15 * MB, rotulo: 'foto' },
  video: { tipos: ['video/mp4', 'video/quicktime', 'video/webm'], max: 200 * MB, rotulo: 'vídeo' },
  texto: { tipos: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'], max: 10 * MB, rotulo: 'arquivo do texto' },
} as const;
export type TipoAnexo = keyof typeof ANEXOS;

/** O arquivo cabe no tipo de anexo? Devolve o motivo de não caber, ou ''. */
export function problemaNoArquivo(tipo: TipoAnexo, mime: string, tamanho: number): string {
  const p = ANEXOS[tipo];
  if (!(p.tipos as readonly string[]).includes(mime)) {
    return tipo === 'video' ? 'Envie o vídeo em MP4, MOV ou WEBM.'
      : tipo === 'foto' ? 'Envie a foto em JPG, PNG ou WEBP.'
      : tipo === 'texto' ? 'Envie o texto em PDF ou Word (ou uma foto da folha, em JPG ou PNG).'
      : 'Envie uma foto (JPG, PNG ou WEBP) ou um PDF do boletim.';
  }
  if (!(tamanho > 0) || tamanho > p.max) return 'O arquivo passa de ' + Math.round(p.max / MB) + ' MB. Envie um menor.';
  return '';
}

/** Id de arquivo da mídia do Wix (ex.: d49d42_81c5…~mv2.jpg). */
export const ID_ARQUIVO = /^[\w~.-]{8,160}$/;
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
  // nomes da lista podem ter duas ou mais palavras (Isaac Newton): até 26 letras, mais o número
  if (apelido.length < 3 || apelido.length > 30 || !/^[\p{L}\p{N} ]+$/u.test(apelido) || chave.length < 3) {
    e['crianca.apelido'] = 'Escolha um nome da lista.';
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
  link?: string;       // participação online (opcional) e produção (vídeo, links)
  ano?: number;        // desempenho
  bimestre?: number;   // desempenho por bimestre: 1 a 4
  media?: number;      // desempenho: 0 a 10
  titulo?: string;     // produção: título do trabalho
  texto?: string;      // produção: texto autoral digitado
  arquivo?: string;    // id do arquivo PRIVADO na mídia do Wix (boletim ou produção)
}
export interface DadosRegistro { researcherId: string; atividade: string; detalhe: DetalheRegistro }

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const diaUTC = (d: Date) => d.toISOString().slice(0, 10);

/** Chave que impede registrar a MESMA coisa duas vezes para a mesma criança. */
export function chaveRegistro(d: DadosRegistro): string {
  const det = d.detalhe;
  if (d.atividade === 'media_bimestre') return 'media_bimestre:' + det.ano + '-' + det.bimestre;
  if (d.atividade === 'media_ano') return 'media_ano:' + det.ano;
  const a = buscarAtividade(d.atividade);
  if (a?.area === 'producao') {
    // o mesmo arquivo, o mesmo link ou o mesmo título não valem duas vezes
    const marca = det.arquivo ? 'arq:' + det.arquivo : det.link ? 'url:' + String(det.link).toLowerCase().replace(/\/+$/, '') : 'tit:' + chaveApelido(String(det.titulo ?? ''));
    return d.atividade + ':' + marca;
  }
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
    if (!ID_ARQUIVO.test(String(det.arquivo ?? ''))) e['registro.arquivo'] = 'Envie a foto ou o PDF do boletim.';
  } else if (area === 'producao') {
    const a = buscarAtividade(chave);
    const titulo = limpa(det.titulo);
    if (titulo.length < 3 || titulo.length > 120) e['registro.titulo'] = 'Dê um título ao trabalho (de 3 a 120 letras).';
    const link = limpa(det.link);
    const temLink = !!link, temArquivo = ID_ARQUIVO.test(String(det.arquivo ?? ''));
    const linkRuim = temLink && (!/^https:\/\/[^\s]+$/i.test(link) || link.length > 300);
    if (a?.anexo === 'link') {
      if (!temLink || linkRuim) e['registro.link'] = 'Cole o link, começando com https://.';
    } else if (a?.anexo === 'foto') {
      if (!temArquivo) e['registro.arquivo'] = 'Envie a foto.';
    } else if (a?.anexo === 'video') {
      if (linkRuim) e['registro.link'] = 'O link precisa começar com https://.';
      else if (!temArquivo && !temLink) e['registro.arquivo'] = 'Envie o vídeo ou cole o link dele.';
    } else if (a?.anexo === 'texto') {
      const texto = String(det.texto ?? '').trim();
      if (texto && (texto.length < 30 || texto.length > 5000)) e['registro.texto'] = 'O texto precisa ter de 30 a 5.000 caracteres.';
      else if (!texto && !temArquivo) e['registro.texto'] = 'Escreva o texto aqui ou envie o arquivo.';
    }
  } else {
    e['registro.atividade'] = 'Esta atividade ainda não aceita registro pelo site.';
  }
  return e;
}

/** Só o que interessa de cada área é guardado (nada de campo extra vindo do navegador). */
export function detalheLimpo(area: string, chave: string, det: DetalheRegistro): DetalheRegistro {
  if (area === 'participacao') return { evento: limpa(det.evento), data: String(det.data), ...(limpa(det.link) ? { link: limpa(det.link) } : {}) };
  if (area === 'producao') {
    const a = buscarAtividade(chave);
    const texto = a?.anexo === 'texto' ? String(det.texto ?? '').trim() : '';
    return {
      titulo: limpa(det.titulo),
      ...(limpa(det.link) && (a?.anexo === 'link' || a?.anexo === 'video') ? { link: limpa(det.link) } : {}),
      ...(texto ? { texto } : {}),
      ...(det.arquivo && a?.anexo !== 'link' ? { arquivo: String(det.arquivo) } : {}),
    };
  }
  return { ano: Number(det.ano), ...(chave === 'media_bimestre' ? { bimestre: Number(det.bimestre) } : {}), media: Math.round(Number(det.media) * 10) / 10, arquivo: String(det.arquivo) };
}

/** O tipo de anexo que a atividade aceita, ou null se ela não tem arquivo. */
export const anexoDa = (a: Atividade | undefined): TipoAnexo | null =>
  a?.anexo && a.anexo !== 'link' ? a.anexo : null;

/* ---------- apelidos: lista do clube + sugestão de nome novo ---------- */

/** Apelido com número quando o nome já está em uso: Newton, Newton001, Newton002… */
export const apelidoNumerado = (base: string, n: number) => (n === 0 ? base : base + String(n).padStart(3, '0'));

export interface DadosSugestao { researcherId: string; nome: string; apelido: string; pesquisa: string }

export function validarSugestao(d: Partial<DadosSugestao>): Erros {
  const e: Erros = {};
  const nome = limpa(d.nome);
  if (nome.length < 3 || nome.length > 120 || !NOME.test(nome)) e['sugestao.nome'] = 'Informe o nome completo da pessoa.';
  const apelido = limpa(d.apelido);
  if (apelido.length < 3 || apelido.length > 26 || !/^[\p{L}\p{N} ]+$/u.test(apelido)) e['sugestao.apelido'] = 'O apelido precisa ter de 3 a 26 letras, podendo ter mais de um nome (os números entram sozinhos, se precisar).';
  const pesquisa = String(d.pesquisa ?? '').trim();
  if (pesquisa.length < 200 || pesquisa.length > 5000) e['sugestao.pesquisa'] = 'Conte a pesquisa em pelo menos 200 caracteres: quem foi, quando e onde viveu, e a ligação com o tema das origens.';
  return e;
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
