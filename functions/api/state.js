export async function onRequest(context) {
  if (context.request.method === 'GET') {
    const assetUrl = new URL('/data/state.json', context.request.url);
    const response = await fetch(assetUrl, { cf: { cacheTtl: 0, cacheEverything: false } });
    if (!response.ok) {
      return Response.json({ error: 'Estado no disponible' }, { status: 500 });
    }
    return new Response(response.body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }
  if (context.request.method === 'PUT') {
    const body = await context.request.text();
    return new Response(body || '{}', {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }
  return new Response('Method Not Allowed', { status: 405 });
}
