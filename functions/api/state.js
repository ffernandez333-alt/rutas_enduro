const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

async function seedFromAssets(context) {
  const assetUrl = new URL('/data/state.json', context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl));
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('json')) {
    throw new Error('Estado no disponible');
  }
  return response.text();
}

function validState(value) {
  return value && typeof value === 'object' && Array.isArray(value.trips) &&
    value.profile && typeof value.profile === 'object';
}

export async function onRequest(context) {
  const kv = context.env.STATE_KV;

  if (context.request.method === 'GET') {
    try {
      let body = kv ? await kv.get('state') : null;
      if (!body) {
        body = await seedFromAssets(context);
        if (kv) await kv.put('state', body);
      }
      return new Response(body, { headers });
    } catch (error) {
      return json({ error: error.message || 'Estado no disponible' }, 500);
    }
  }

  if (context.request.method === 'PUT') {
    if (!kv) return json({ error: 'Almacenamiento persistente no configurado' }, 503);
    try {
      const body = await context.request.text();
      if (body.length > 2_000_000) return json({ error: 'Estado demasiado grande' }, 413);
      const value = JSON.parse(body);
      if (!validState(value)) return json({ error: 'Formato de estado no válido' }, 400);
      await kv.put('state', JSON.stringify(value));
      return json({ ok: true });
    } catch {
      return json({ error: 'Formato de estado no válido' }, 400);
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, PUT' } });
}

