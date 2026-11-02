/**
 * Galeria de avatares do membro pesquisador — ilustrações de ciência, nunca
 * foto (a criança aparece no clube só pelo apelido e por um destes).
 * Desenhados aqui em SVG (traço, 24×24) para não depender de imagem externa;
 * a cor de fundo vem do CSS (.av--<chave>).
 */
import type { AVATARES } from './regras';

type Chave = (typeof AVATARES)[number];

const TRACOS: Record<Chave, string> = {
  atomo: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
  lupa: '<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/><path d="M7.5 8.5a3 3 0 0 1 3-2"/>',
  telescopio: '<path d="m3 13 12-6 2 4-12 6z"/><path d="m15 7 3-1.5 2 4-3 1.5"/><path d="m9 15 3 6"/><path d="m9 15-3 6"/>',
  folha: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  planeta: '<circle cx="12" cy="12" r="5.5"/><path d="M4.2 15.5C1.8 17.6 1.5 19.4 3 20c2 .8 7-1.4 11.4-4.9S21.7 8 21 6c-.5-1.4-2.4-1.3-4.7 0"/>',
  foguete: '<path d="M12 3c3 2 4.5 5.5 4.5 9.5L14 16h-4l-2.5-3.5C7.5 8.5 9 5 12 3z"/><circle cx="12" cy="9.5" r="1.6"/><path d="m10 16-1.5 4 3.5-2 3.5 2L14 16"/>',
  borboleta: '<path d="M12 7v12"/><path d="M12 10C9-1 2 5 5 11c1 2 4 2 7-1z"/><path d="M12 10c3-11 10-5 7 1-1 2-4 2-7-1z"/><path d="M12 13c-3 0-6 2-5 5s4 1 5-2"/><path d="M12 13c3 0 6 2 5 5s-4 1-5-2"/>',
  fossil: '<path d="M12 4a8 8 0 1 1-8 8"/><path d="M12 8a4 4 0 1 1-4 4"/><path d="M12 11a1 1 0 1 1-1 1"/><path d="M4 12h3"/><path d="M6.3 6.3 8.4 8.4"/><path d="M12 4v3"/>',
};

export const NOMES_AVATAR: Record<Chave, string> = {
  atomo: 'Átomo', lupa: 'Lupa', telescopio: 'Telescópio', folha: 'Folha',
  planeta: 'Planeta', foguete: 'Foguete', borboleta: 'Borboleta', fossil: 'Fóssil',
};

/** O SVG do avatar (decorativo: o nome vai no rótulo de quem usa). */
export function svgAvatar(chave: string): string {
  const t = TRACOS[chave as Chave];
  if (!t) return '';
  return '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t + '</svg>';
}
