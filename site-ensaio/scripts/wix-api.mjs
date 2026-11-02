// Chamada REST à API do Wix como DONO do site (token da CLI, sessão do dono).
// Só para scripts de manutenção rodados à mão — nunca importe isto no site.
import { readFileSync } from 'node:fs';
import { wixToken } from '../../.agents/skills/wix-headless-templates/shared/seed/wix-cli.mjs';

export const siteId = JSON.parse(readFileSync(new URL('../wix.config.json', import.meta.url), 'utf8')).siteId;
let token;

export async function wix(metodo, caminho, corpo) {
  token ??= wixToken(siteId);
  const r = await fetch('https://www.wixapis.com' + caminho, {
    method: metodo,
    headers: {
      Authorization: 'Bearer ' + token, 'wix-site-id': siteId,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let j; try { j = texto ? JSON.parse(texto) : {}; } catch { j = { bruto: texto.slice(0, 400) }; }
  if (!r.ok) {
    const e = new Error(metodo + ' ' + caminho + ' → ' + r.status + ' ' + JSON.stringify(j).slice(0, 500));
    e.status = r.status; e.corpo = j;
    throw e;
  }
  return j;
}
