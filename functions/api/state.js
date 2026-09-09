// Pages Function que sirve el estado inicial incluido en el repositorio.
// La aplicación local mantiene la escritura mediante su servidor Node.
export async function onRequestGet(context) {
  const assetUrl = new URL('/data/state.json', context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(assetUrl));
  if (!response.ok) return new Response(JSON.stringify({ error: 'Estado no disponible' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(response.body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestPut(context) {
  // Acepta el formato de guardado de la app para evitar errores de interfaz.
  // La persistencia compartida se conectará a KV/D1 en la siguiente fase.
  const body = await context.request.text();
  return new Response(body || '{}', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
