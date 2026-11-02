/**
 * reCAPTCHA do login e do cadastro — a caixa "Não sou um robô".
 *
 * O site do cliente exige reCAPTCHA para membros. Testado em 21/10/2026
 * contra a rota de login, com tokens falsos:
 *   invisibleRecaptchaToken  → "missingCaptchaToken"  (o Wix ignora o campo)
 *   recaptchaToken           → "invalidCaptchaToken"  (o Wix lê o campo)
 * Ou seja, este site está configurado para o reCAPTCHA **visível**. O
 * invisível, que a documentação recomenda em geral, não vale aqui.
 *   → Se o dono trocar para invisível nas configurações de membros do Wix,
 *     a troca é: chave `captchaInvisibleSiteKey`, `size: 'invisible'` +
 *     `execute()`, e o campo `invisibleRecaptchaToken` em login-captcha.ts.
 *
 * Duas regras da documentação do Wix, seguidas aqui:
 * https://dev.wix.com/docs/go-headless/authentication/members/custom-login-page/re-captcha/add-re-captcha-to-a-custom-login-page-js-sdk.md
 *   - é o reCAPTCHA **Enterprise** do Google;
 *   - a chave é a **do Wix**, não nossa — quem confere o token é o Wix. Ela
 *     vem do próprio SDK (captchaVisibleSiteKey), lida daqui para não
 *     envelhecer se o Wix trocar.
 */
import { OAuthStrategy } from '@wix/sdk';
import { WIX_CLIENT_ID } from 'astro:env/client';

const CHAVE = OAuthStrategy({ clientId: WIX_CLIENT_ID }).captchaVisibleSiteKey;

type Enterprise = {
  render: (el: HTMLElement, opcoes: Record<string, unknown>) => number;
  reset: (id: number) => void;
  getResponse: (id: number) => string;
};

let carregando: Promise<Enterprise> | null = null;

function carregar(): Promise<Enterprise> {
  const w = window as unknown as { grecaptcha?: { enterprise?: Enterprise }; __clubeCaptcha?: () => void };
  if (w.grecaptcha?.enterprise?.render) return Promise.resolve(w.grecaptcha.enterprise);
  if (carregando) return carregando;
  carregando = new Promise<Enterprise>((ok, falha) => {
    w.__clubeCaptcha = () => ok(w.grecaptcha!.enterprise!);
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/enterprise.js?render=explicit&onload=__clubeCaptcha&hl=pt-BR';
    s.async = true;
    s.onerror = () => { carregando = null; falha(new Error('captcha-indisponivel')); };
    document.head.appendChild(s);
  });
  return carregando;
}

let g: Enterprise | null = null;
let id: number | null = null;

/** Desenha a caixa. Falha se o Google não carregar (bloqueador, rede) — quem chama decide o que fazer. */
export async function mostrarCaixa(lugar: HTMLElement, aoMudar: () => void): Promise<void> {
  g = await carregar();
  if (id === null) {
    id = g.render(lugar, {
      sitekey: CHAVE,
      size: 'normal',
      callback: aoMudar,
      'expired-callback': aoMudar,
    });
  }
}

/** Token da caixa, ou '' se ela não foi marcada (ou não carregou). */
export function tokenDaCaixa(): string {
  return g && id !== null ? g.getResponse(id) : '';
}

/** Cada token vale um envio só: depois de uma resposta, a caixa precisa ser marcada de novo. */
export function zerarCaixa(): void {
  if (g && id !== null) g.reset(id);
}
