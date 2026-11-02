/**
 * Portaria dos endpoints do clube (src/pages/api/clube/*).
 *
 * O Wix exige `security.checkOrigin: false` no Astro, então a conferência de
 * origem que o Astro faria fica aqui: só aceita JSON (um formulário de outro
 * site não consegue mandar JSON sem passar pelo CORS) e, quando o navegador
 * informa a origem, ela tem de ser a deste site.
 */
export const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export function recusaOrigem(request: Request): Response | null {
  const tipo = request.headers.get('content-type') || '';
  if (!tipo.toLowerCase().startsWith('application/json')) return json({ erros: { geral: 'Formato inválido.' } }, 415);
  const origem = request.headers.get('origin');
  if (origem && origem !== new URL(request.url).origin) return json({ erros: { geral: 'Origem não permitida.' } }, 403);
  return null;
}

export async function lerJson(request: Request): Promise<Record<string, any> | null> {
  try {
    const texto = await request.text();
    if (texto.length > 20_000) return null;
    const v = JSON.parse(texto);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export const NAO_LOGADO = () => json({ erros: { geral: 'Entre na sua conta de responsável para continuar.' } }, 401);
export const FALHA = (e: unknown) => {
  console.error('[clube] falha no servidor:', e);
  return json({ erros: { geral: 'Não foi possível concluir agora. Tente de novo em instantes.' } }, 500);
};
