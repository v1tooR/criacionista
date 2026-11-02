/**
 * Login e cadastro **com o token do reCAPTCHA**.
 *
 * O código do kit (src/wix/members/auth.ts) manda só e-mail, senha e retorno,
 * e o kit pede para não editá-lo ("extend by adding functions"). A rota da
 * integração já aceita o token (`recaptchaToken`, ver
 * node_modules/@wix/astro/.../credentialsRoutes.mjs), então esta função faz o
 * mesmo POST com ele junto e lê a resposta com o `fromAuthRoute` do próprio
 * kit — a interpretação das respostas continua sendo uma só, a do kit.
 *
 * Por que `recaptchaToken` (o da caixa visível) e não o invisível: ver o
 * cabeçalho de src/captcha.ts.
 */
import { fromAuthRoute, type LoginResult } from './wix/members/auth-core';

export async function enviarCredenciais(
  modo: 'entrar' | 'criar',
  email: string,
  senha: string,
  volta: string,
  recaptchaToken: string,
): Promise<LoginResult> {
  const res = await fetch(modo === 'criar' ? '/api/auth/signup' : '/api/auth/login', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      email,
      password: senha,
      returnToUrl: volta,
      ...(recaptchaToken ? { recaptchaToken } : {}),
    }),
  });
  const json = (await res.json().catch(() => null)) as Record<string, any> | null;
  const r = fromAuthRoute(res.status, json);

  // sucesso ainda não é sessão: o navegador precisa passar pela autorização
  // do Wix, que volta por /api/auth/callback já logado (o mesmo que o kit faz)
  if (r.state === 'SUCCESS' && r.redirectUrl) window.location.assign(r.redirectUrl);

  return r;
}
