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
 * `liberada: false` — ainda não aceita registro (produção científica espera a
 *   decisão sobre como comprovar: pelo site ou postando com o clube).
 */
export type Area = 'producao' | 'participacao' | 'desempenho';

export interface Atividade {
  chave: string;
  area: Area;
  nome: string;
  pontos: number;
  quem: 'responsavel' | 'equipe' | 'ambos';
  liberada: boolean;
}

export const AREAS: Record<Area, string> = {
  producao: 'Produção científica',
  participacao: 'Participação em atividades',
  desempenho: 'Desempenho acadêmico',
};

export const ATIVIDADES: Atividade[] = [
  { chave: 'video_autoral', area: 'producao', nome: 'Vídeo autoral', pontos: 10, quem: 'responsavel', liberada: false },
  { chave: 'texto_autoral', area: 'producao', nome: 'Texto autoral', pontos: 10, quem: 'responsavel', liberada: false },
  { chave: 'foto_autoral', area: 'producao', nome: 'Foto autoral', pontos: 5, quem: 'responsavel', liberada: false },
  { chave: 'link_postagem', area: 'producao', nome: 'Link de postagem', pontos: 1, quem: 'responsavel', liberada: false },
  { chave: 'link_artigo', area: 'producao', nome: 'Link de artigo ou reportagem', pontos: 1, quem: 'responsavel', liberada: false },
  { chave: 'link_video', area: 'producao', nome: 'Link de vídeo', pontos: 1, quem: 'responsavel', liberada: false },

  { chave: 'palestra_presencial', area: 'participacao', nome: 'Palestra presencial', pontos: 20, quem: 'equipe', liberada: true },
  { chave: 'palestra_online', area: 'participacao', nome: 'Palestra online, com o quiz respondido', pontos: 10, quem: 'ambos', liberada: true },
  { chave: 'exposicao', area: 'participacao', nome: 'Exposição', pontos: 5, quem: 'ambos', liberada: true },
  { chave: 'oficina', area: 'participacao', nome: 'Oficina', pontos: 15, quem: 'ambos', liberada: true },
  { chave: 'curso', area: 'participacao', nome: 'Curso concluído, com as avaliações', pontos: 50, quem: 'ambos', liberada: true },

  { chave: 'media_bimestre', area: 'desempenho', nome: 'Média do bimestre igual ou maior que 8,0', pontos: 10, quem: 'responsavel', liberada: true },
  { chave: 'media_ano', area: 'desempenho', nome: 'Média final do ano igual ou maior que 8,0', pontos: 10, quem: 'responsavel', liberada: true },
];

export const atividade = (chave: string) => ATIVIDADES.find((a) => a.chave === chave);
export const responsavelPodeRegistrar = (a: Atividade) => a.liberada && a.quem !== 'equipe';
export const equipePodeLancar = (a: Atividade) => a.liberada && a.quem !== 'responsavel';

export const MEDIA_MINIMA = 8;
