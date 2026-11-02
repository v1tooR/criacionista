// SÓ NO ENSAIO: mostra como a requisição chega ao servidor do Wix. Nunca vai para site/.
export const prerender = false;
export const GET = ({ request, url }: { request: Request; url: URL }) => {
  const h: Record<string, string> = {};
  for (const k of ['host', 'origin', 'referer', 'x-forwarded-host', 'x-forwarded-proto', 'x-wix-host', 'x-original-host', 'cf-connecting-ip']) {
    const v = request.headers.get(k);
    if (v) h[k] = k === 'cf-connecting-ip' ? 'presente' : v;
  }
  const nomes = [...request.headers.keys()].filter((k) => !/cookie|authorization/i.test(k));
  return new Response(JSON.stringify({ requestUrl: request.url, astroUrl: url.href, h, nomes }, null, 1), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
