/**
 * Confere se um Client ID funciona e o que ele enxerga do site do cliente.
 *
 *   node scripts/testa-wix.mjs <clientId>
 *   node scripts/testa-wix.mjs              (usa WIX_CLIENT_ID do ambiente)
 *
 * Rodar de dentro de site/. É a primeira coisa a fazer quando chegar um Client
 * ID novo: diz na hora se ele autoriza a leitura do blog, antes de mexer em
 * qualquer página.
 */
import { createClient, OAuthStrategy, media } from '@wix/sdk';
import { posts, categories } from '@wix/blog';

const clientId = process.argv[2] || process.env.WIX_CLIENT_ID || '';
if (!clientId) {
  console.error('uso: node scripts/testa-wix.mjs <clientId>');
  process.exit(1);
}

const wix = createClient({
  modules: { posts, categories },
  auth: OAuthStrategy({ clientId }),
});

/**
 * O SDK não detalha falha de credencial: devolve `code: UNKNOWN` e a mensagem
 * "System error occurred: {}", sem status HTTP nem corpo de resposta. Como essa
 * combinação só aparece quando a troca de token não acontece, vale traduzi-la
 * em vez de repassar um texto que não ajuda ninguém.
 */
const falha = (o, e) => {
  const vazio = e.code === 'UNKNOWN' && /System error occurred/.test(e.message);
  console.log('  FALHOU: ' + e.message + (e.code ? '  [' + e.code + ']' : ''));
  if (vazio) {
    console.log('  → quase sempre é Client ID inválido ou de outro site.');
    console.log('    Confira que ele veio das Headless Settings de');
    console.log('    clubecriacionista.com, e não de outro projeto.');
  } else if (/403|forbidden|permission/i.test(e.message)) {
    console.log('  → o app existe, mas não tem permissão de ler ' + o + '.');
  } else if (/401|unauthor|invalid.*client/i.test(e.message)) {
    console.log('  → Client ID recusado.');
  }
};

console.log('Client ID: ' + clientId.slice(0, 8) + '…' + clientId.slice(-4) + '\n');

console.log('CATEGORIAS');
const porId = new Map();
try {
  const r = await wix.categories.listCategories();
  const lista = r.categories ?? [];
  console.log('  ' + lista.length + ' encontradas');
  for (const c of lista) {
    porId.set(c._id, c.label);
    console.log('  - ' + c.label + '  (' + (c.postCount ?? '?') + ' posts)');
  }
} catch (e) {
  falha('as categorias', e);
}

console.log('\nPOSTS');
try {
  const r = await wix.posts.listPosts({
    sort: 'PUBLISHED_DATE_DESC',
    paging: { limit: 20 },
    fieldsets: ['URL'],
  });
  const lista = r.posts ?? [];
  console.log('  ' + lista.length + ' de ' + (r.metaData?.total ?? '?') + ' no total\n');

  lista.forEach((p, i) => {
    const d = p.firstPublishedDate ? new Date(p.firstPublishedDate).toISOString().slice(0, 10) : '?';
    const cat = (p.categoryIds ?? []).map((id) => porId.get(id)).filter(Boolean).join(', ') || '—';
    let capa = '(sem capa)';
    try { if (p.heroImage) capa = media.getImageUrl(p.heroImage).url; } catch { capa = '(capa ilegível)'; }
    console.log('  [' + (i + 1) + '] ' + p.title);
    console.log('      ' + d + ' · ' + cat + ' · ' + (p.minutesToRead ?? '?') + ' min');
    console.log('      ' + (p.url?.toString() || '/post/' + p.slug));
    console.log('      capa: ' + capa);
  });

  if (!lista.length) {
    console.log('  Nenhum post. Se o Client ID é do site do cliente, isso é inesperado');
    console.log('  (o feed mostra 12). Se é do projeto da prévia, é o esperado: blog vazio.');
  }
} catch (e) {
  falha('os posts', e);
}
