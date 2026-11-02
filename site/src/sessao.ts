/**
 * Estado de login no cabeçalho, em todas as páginas.
 *
 * As páginas são geradas na build, antes de existir visitante, então quem diz
 * se a pessoa está logada é o navegador, na hora da visita. A sessão mora no
 * cookie `wixSession`, que a integração do Wix grava sem HttpOnly
 * (node_modules/@wix/astro/.../saveSessionTokensToCookie.mjs: só `path` e
 * `secure`) justamente para o script dela no navegador ler.
 *
 * O cabeçalho tem duas versões de cada controle, e este módulo só alterna:
 *   [data-sessao="visitante"]  "Entrar"
 *   [data-sessao="membro"]     "Olá, Ana" e "Sair" — começam com `hidden`
 *
 * Para não piscar "Entrar" para quem já está logado, a primeira decisão sai
 * do papel gravado no próprio cookie, sem rede:
 *   - sem cookie, ou papel "visitor"  → visitante, e nenhuma chamada ao Wix
 *     (é o caso de quase toda visita: quem nunca logou não tem cookie)
 *   - papel "member"                  → já mostra como logado; a leitura do
 *     membro, logo depois, confirma e traz o nome
 *   - cookie em formato inesperado    → pergunta ao Wix antes de decidir
 *
 * A palavra final é sempre a do Wix (member-store, o código do kit); o cookie
 * é só a dica que evita o pisca.
 */
import { getMemberState, logout, subscribeMember } from './wix/members/member-store';

export type Papel = 'member' | 'visitor' | 'desconhecido' | 'sem-cookie';

/** A dica sem rede — exportada para a página de login, que precisa da mesma leitura. */
export function papelNoCookie(): Papel {
  const linha = document.cookie.split('; ').find((c) => c.startsWith('wixSession='));
  if (!linha) return 'sem-cookie';
  try {
    const valor = JSON.parse(decodeURIComponent(linha.slice('wixSession='.length)));
    const role = valor?.tokens?.refreshToken?.role;
    return role === 'member' || role === 'visitor' ? role : 'desconhecido';
  } catch {
    return 'desconhecido';
  }
}

function primeiroNome(nome: string): string {
  return (nome || '').trim().split(/\s+/)[0] || '';
}

function aplicar(membro: boolean, nome = ''): void {
  document.querySelectorAll<HTMLElement>('[data-sessao="visitante"]').forEach((el) => { el.hidden = membro; });
  document.querySelectorAll<HTMLElement>('[data-sessao="membro"]').forEach((el) => { el.hidden = !membro; });
  const n = primeiroNome(nome);
  document.querySelectorAll<HTMLElement>('[data-sessao-ola]').forEach((el) => {
    el.textContent = n ? 'Olá, ' + n : 'Olá';
    el.title = n; // o nome inteiro, quando a largura corta com "…"
  });
  // em telas onde o "Olá" some, o "Sair" do cabeçalho ainda diz de quem é a conta
  document.querySelectorAll<HTMLElement>('.hdr__cta [data-sair]').forEach((el) => {
    el.title = n ? 'Sair da conta de ' + n : 'Sair da conta';
  });
  document.querySelectorAll<HTMLElement>('[data-sessao-sair-nome]').forEach((el) => {
    el.textContent = n ? 'Sair (' + n + ')' : 'Sair';
  });
}

const papel = papelNoCookie();

if (papel === 'member') aplicar(true);

if (papel === 'member' || papel === 'desconhecido') {
  subscribeMember(() => {
    const s = getMemberState();
    if (s.loading) return;
    aplicar(s.loggedIn, s.member?.displayName ?? '');
  });
}

/* sair: a integração pede um POST, que o member-store monta e envia */
document.addEventListener('click', (e) => {
  const alvo = (e.target as HTMLElement | null)?.closest?.('[data-sair]');
  if (!alvo) return;
  e.preventDefault();
  void logout(location.pathname);
});
