/**
 * Servidor local da build, para as verificações em scripts/.
 *
 * Existe porque `astro preview` não funciona com o adaptador de hospedagem do
 * Wix: a prévia do Cloudflare procura dist/server/wrangler.json, que é
 * justamente o arquivo que precisa ser apagado para o deploy no Wix funcionar
 * (ver wrangler.jsonc e astro.config.mjs). O caminho oficial para desenvolver
 * com servidor é `wix dev`; este aqui serve só o que as verificações olham.
 *
 * Serve dist/client — as páginas geradas na build — e aplica o _redirects que
 * a build escreve, então os 301 do site antigo também são testáveis aqui.
 * As rotas do servidor (/api/auth/*) não existem neste modo.
 *
 * NUNCA envia nada para o Wix. É local, porta 4321.
 *
 * Uso:  npm run preview      (dentro de site/)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../dist/client/', import.meta.url));
const PORTA = Number(process.env.PORTA || 4321);

if (!existsSync(RAIZ)) {
  console.error('dist/client não existe. Rode `npm run build` antes.');
  process.exit(1);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

/* _redirects: "origem destino status" por linha */
const REDIR = new Map();
const arqRedir = join(RAIZ, '_redirects');
if (existsSync(arqRedir)) {
  for (const linha of readFileSync(arqRedir, 'utf8').split('\n')) {
    const [de, para, st] = linha.trim().split(/\s+/);
    if (de && para && !de.startsWith('#')) REDIR.set(de, { para, status: Number(st) || 301 });
  }
}

const servir = async (caminho) => {
  try {
    const s = await stat(caminho);
    if (s.isFile()) return { corpo: await readFile(caminho), tipo: TIPOS[extname(caminho)] || 'application/octet-stream' };
  } catch { /* não existe */ }
  return null;
};

createServer(async (req, res) => {
  let rota;
  try { rota = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400).end(); return; }

  const r = REDIR.get(rota);
  if (r) { res.writeHead(r.status, { Location: r.para }).end(); return; }

  // impede escapar da pasta com ../
  const alvo = normalize(join(RAIZ, rota));
  if (!alvo.startsWith(normalize(RAIZ))) { res.writeHead(403).end(); return; }

  // /o-clube → o-clube.html, como o `astro preview` fazia — o diff-texto pede
  // as rotas sem extensão
  const achado = (await servir(alvo))
    || (rota.endsWith('/') ? await servir(join(alvo, 'index.html')) : null)
    || (!extname(rota) ? await servir(alvo + '.html') : null);
  if (achado) { res.writeHead(200, { 'Content-Type': achado.tipo }).end(achado.corpo); return; }

  const naoAchei = await servir(join(RAIZ, '404.html'));
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(naoAchei ? naoAchei.corpo : 'Not found');
}).listen(PORTA, () => {
  console.log('servindo dist/client em http://localhost:' + PORTA + '  (' + REDIR.size + ' redirecionamentos)');
});
