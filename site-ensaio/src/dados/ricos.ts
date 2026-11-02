/**
 * Converte o conteúdo rico do Wix (Ricos) em HTML.
 *
 * O caminho oficial é o pacote @wix/ricos, que é um componente React. Puxar
 * React para dentro de um site estático por causa de 12 posts seria caro, e os
 * posts deste blog usam só seis tipos de nó — levantei antes de escrever:
 *
 *   PARAGRAPH, TEXT, BULLETED_LIST, ORDERED_LIST, LIST_ITEM, IMAGE
 *
 * e cinco decorações: BOLD, ITALIC, UNDERLINE, COLOR, LINK.
 *
 * Nó que eu não souber renderizar é ignorado em silêncio no HTML, mas contado
 * em `naoReconhecidos` para aparecer no aviso da build. Se o cliente passar a
 * usar vídeo, citação ou tabela, a gente fica sabendo na hora de gerar — não
 * pelo leitor.
 */
import { media } from '@wix/sdk';

/** Escapa texto que vai para o corpo do HTML. */
const esc = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/** Escapa o que vai dentro de um atributo entre aspas duplas. */
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');

/** Só http(s) e mailto viram link; qualquer outro esquema é descartado. */
const urlSegura = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : '');

export interface ResultadoRicos {
  html: string;
  naoReconhecidos: string[];
}

/**
 * Id da primeira imagem do corpo, ou ''.
 *
 * O Wix adota a primeira imagem do post como capa — em 10 dos 12 posts deste
 * blog as duas são a mesma. Saber disso é o que permite não mostrar a mesma
 * foto duas vezes seguidas no topo da página.
 */
export function primeiraImagem(conteudo: any): string {
  let achado = '';
  const anda = (ns: any[]) => {
    for (const n of ns || []) {
      if (achado) return;
      if (n.type === 'IMAGE') { achado = n.imageData?.image?.src?.id || ''; if (achado) return; }
      if (n.nodes?.length) anda(n.nodes);
    }
  };
  anda(conteudo?.nodes || []);
  return achado;
}

const LARGURAS: Record<string, number> = {
  SMALL: 480,
  CONTENT: 840,
  ORIGINAL: 840,
  FULL_WIDTH: 1200,
};

export function ricosParaHtml(conteudo: any): ResultadoRicos {
  const naoReconhecidos: string[] = [];

  /** Um nó TEXT: o texto com as decorações aplicadas de dentro para fora. */
  const texto = (no: any): string => {
    const d = no.textData || {};
    let out = esc(d.text || '');
    if (!out) return '';

    const tipos = new Set((d.decorations || []).map((x: any) => x.type));
    const achar = (t: string) => (d.decorations || []).find((x: any) => x.type === t);

    if (tipos.has('BOLD')) out = '<strong>' + out + '</strong>';
    if (tipos.has('ITALIC')) out = '<em>' + out + '</em>';
    if (tipos.has('UNDERLINE')) out = '<u>' + out + '</u>';

    const cor = achar('COLOR');
    if (cor?.colorData?.foreground) {
      // só cor em notação hexadecimal entra; qualquer outra coisa vira texto sem cor
      const c = String(cor.colorData.foreground);
      if (/^#[0-9a-f]{3,8}$/i.test(c)) out = '<span style="color:' + c + '">' + out + '</span>';
    }

    const link = achar('LINK');
    const href = urlSegura(link?.linkData?.link?.url || '');
    if (href) {
      const branco = link.linkData.link.target === 'BLANK';
      out = '<a href="' + escAttr(href) + '"'
        + (branco ? ' target="_blank" rel="noopener noreferrer"' : '')
        + '>' + out + '</a>';
    }
    return out;
  };

  const imagem = (no: any): string => {
    const d = no.imageData || {};
    const id = d.image?.src?.id;
    if (!id) return '';

    const lg = d.containerData?.width?.size;
    const largura = LARGURAS[lg] || 840;
    const ow = d.image?.width || largura;
    const oh = d.image?.height || Math.round(largura * 0.66);

    // o helper do SDK quer a URI interna; o nó traz só o id solto
    const uri = 'wix:image://v1/' + id + '#originWidth=' + ow + '&originHeight=' + oh;
    let src = '';
    try {
      const alt = Math.round(largura * (oh / ow));
      src = media.getScaledToFitImageUrl(uri, largura, alt, {});
    } catch {
      src = 'https://static.wixstatic.com/media/' + id;
    }

    const alinhamento = (d.containerData?.alignment || 'CENTER').toLowerCase();
    const legenda = d.caption ? '<figcaption>' + esc(d.caption) + '</figcaption>' : '';

    return '<figure class="post__fig post__fig--' + alinhamento + '">'
      + '<img src="' + escAttr(src) + '" alt="' + escAttr(d.altText || '') + '"'
      + ' width="' + ow + '" height="' + oh + '" loading="lazy">'
      + legenda + '</figure>';
  };

  const filhos = (ns: any[]): string => (ns || []).map(no).join('');

  function no(n: any): string {
    switch (n.type) {
      case 'TEXT':
        return texto(n);

      case 'PARAGRAPH': {
        const dentro = filhos(n.nodes);
        // parágrafo vazio é quebra proposital do autor, não lixo
        return dentro.trim() ? '<p>' + dentro + '</p>' : '';
      }

      case 'BULLETED_LIST':
        return '<ul>' + filhos(n.nodes) + '</ul>';

      case 'ORDERED_LIST':
        return '<ol>' + filhos(n.nodes) + '</ol>';

      case 'LIST_ITEM':
        // o item embrulha parágrafos; desembrulhar evita <p> dentro de <li>
        return '<li>' + filhos(n.nodes).replace(/^<p>|<\/p>$/g, '') + '</li>';

      case 'IMAGE':
        return imagem(n);

      case 'HEADING': {
        const nivel = Math.min(Math.max(n.headingData?.level || 2, 2), 4);
        return '<h' + nivel + '>' + filhos(n.nodes) + '</h' + nivel + '>';
      }

      case 'DIVIDER':
        return '<hr>';

      case 'BLOCKQUOTE':
        return '<blockquote>' + filhos(n.nodes) + '</blockquote>';

      default:
        if (n.type) naoReconhecidos.push(n.type);
        return '';
    }
  }

  const html = filhos(conteudo?.nodes || []);
  return { html, naoReconhecidos: [...new Set(naoReconhecidos)] };
}
