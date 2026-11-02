/**
 * Catálogo das atividades que valem pontos — o programa de recompensas do
 * clube (clubecriacionista.com/recompensas, lido em 22/10/2026). É a mesma
 * tabela da página Como funciona.
 *
 * O SERVIDOR tira os pontos daqui: o navegador manda só a chave da atividade,
 * nunca quantos pontos ela vale. Mudou um valor? Mude aqui E na tabela do
 * protótipo (como-funciona.html), e os créditos novos já saem com o valor novo;
 * os antigos ficam como foram lançados (o extrato não se reescreve).
 *
 * `quem`: quem pode registrar.
 *   responsavel — o responsável registra pelo painel e a equipe aprova;
 *   equipe      — só a equipe lança (presença conferida no credenciamento).
 * `liberada: false` — ainda não aceita registro.
 * `anexo` — o que o responsável envia junto (ver ANEXOS em regras.ts):
 *   arquivo obrigatório (boletim, foto), arquivo OU link (vídeo), arquivo OU
 *   texto digitado (texto autoral), ou só link (as atividades de link).
 * `imagem` — envia foto ou vídeo da criança: exige a autorização de imagem.
 *
 * Produção científica liberada em 26/10/2026, com envio pelo site: o cliente
 * pediu para abrir o envio do print do boletim junto com o registro, e o mesmo
 * envio serve para as produções.
 */
export type Area = 'producao' | 'participacao' | 'desempenho';

export interface Atividade {
  chave: string;
  area: Area;
  nome: string;
  pontos: number;
  quem: 'responsavel' | 'equipe' | 'ambos';
  liberada: boolean;
  anexo?: 'boletim' | 'foto' | 'video' | 'texto' | 'link';
  imagem?: boolean;
}

export const AREAS: Record<Area, string> = {
  producao: 'Produção científica',
  participacao: 'Participação em atividades',
  desempenho: 'Desempenho acadêmico',
};

export const ATIVIDADES: Atividade[] = [
  { chave: 'video_autoral', area: 'producao', nome: 'Vídeo autoral', pontos: 10, quem: 'responsavel', liberada: true, anexo: 'video', imagem: true },
  { chave: 'texto_autoral', area: 'producao', nome: 'Texto autoral', pontos: 10, quem: 'responsavel', liberada: true, anexo: 'texto' },
  { chave: 'foto_autoral', area: 'producao', nome: 'Foto autoral', pontos: 5, quem: 'responsavel', liberada: true, anexo: 'foto', imagem: true },
  { chave: 'link_postagem', area: 'producao', nome: 'Link de postagem', pontos: 1, quem: 'responsavel', liberada: true, anexo: 'link' },
  { chave: 'link_artigo', area: 'producao', nome: 'Link de artigo ou reportagem', pontos: 1, quem: 'responsavel', liberada: true, anexo: 'link' },
  { chave: 'link_video', area: 'producao', nome: 'Link de vídeo', pontos: 1, quem: 'responsavel', liberada: true, anexo: 'link' },

  { chave: 'palestra_presencial', area: 'participacao', nome: 'Palestra presencial', pontos: 20, quem: 'equipe', liberada: true },
  { chave: 'palestra_online', area: 'participacao', nome: 'Palestra online, com o quiz respondido', pontos: 10, quem: 'ambos', liberada: true },
  { chave: 'exposicao', area: 'participacao', nome: 'Exposição', pontos: 5, quem: 'ambos', liberada: true },
  { chave: 'oficina', area: 'participacao', nome: 'Oficina', pontos: 15, quem: 'ambos', liberada: true },
  { chave: 'curso', area: 'participacao', nome: 'Curso concluído, com as avaliações', pontos: 50, quem: 'ambos', liberada: true },

  { chave: 'media_bimestre', area: 'desempenho', nome: 'Média do bimestre igual ou maior que 8,0', pontos: 10, quem: 'responsavel', liberada: true, anexo: 'boletim' },
  { chave: 'media_ano', area: 'desempenho', nome: 'Média final do ano igual ou maior que 8,0', pontos: 10, quem: 'responsavel', liberada: true, anexo: 'boletim' },
];

export const atividade = (chave: string) => ATIVIDADES.find((a) => a.chave === chave);
export const responsavelPodeRegistrar = (a: Atividade) => a.liberada && a.quem !== 'equipe';
export const equipePodeLancar = (a: Atividade) => a.liberada && a.quem !== 'responsavel';

export const MEDIA_MINIMA = 8;
