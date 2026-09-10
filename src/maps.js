function elements(doc, name) {
  return [...doc.getElementsByTagNameNS('*', name)];
}

function coordsFromElement(element) {
  return element.textContent.trim().split(/\s+/).map(value => {
    const [lon, lat, ele = 0] = value.split(',').map(Number);
    return { lat, lon, ele };
  }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
}

export function parsePoints(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw Error('El archivo no contiene XML válido.');
  const trackPoints = [...elements(doc, 'trkpt'), ...elements(doc, 'rtept')];
  const waypointPoints = elements(doc, 'wpt');
  let points;
  let waypointsOnly = false;

  if (trackPoints.length) {
    points = trackPoints.map(e => ({
      lat: Number(e.getAttribute('lat')),
      lon: Number(e.getAttribute('lon')),
      ele: Number(elements(e, 'ele')[0]?.textContent || 0)
    }));
  } else if (waypointPoints.length) {
    points = waypointPoints.map(e => ({
      lat: Number(e.getAttribute('lat')),
      lon: Number(e.getAttribute('lon')),
      ele: Number(elements(e, 'ele')[0]?.textContent || 0)
    }));
    waypointsOnly = true;
  } else {
    const lineStrings = elements(doc, 'LineString');
    const pointElements = elements(doc, 'Point');
    if (lineStrings.length) {
      points = lineStrings.flatMap(line => elements(line, 'coordinates').flatMap(coordsFromElement));
    } else if (pointElements.length) {
      points = pointElements.flatMap(point => elements(point, 'coordinates').flatMap(coordsFromElement));
      waypointsOnly = true;
    } else {
      points = elements(doc, 'coordinates').flatMap(coordsFromElement);
      waypointsOnly = points.length > 0;
    }
  }

  points = (points || []).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
  if (points.length < (waypointsOnly ? 1 : 2)) throw Error(waypointsOnly ? 'El archivo debe incluir al menos un waypoint.' : 'El archivo debe incluir un recorrido con al menos dos puntos.');
  if (waypointsOnly) points.waypointsOnly = true;
  return points;
}

export function routeStats(points) {
  if (points.waypointsOnly) return { distance: 0, elevation: 0 };
  let distance = 0, elevation = 0;
  const rad = x => x * Math.PI / 180;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    distance += 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    elevation += Math.max(0, (b.ele || 0) - (a.ele || 0));
  }
  return { distance: Math.round(distance * 10) / 10, elevation: Math.round(elevation) };
}

function xmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[char]));
}

export function pointsToGpx(points) {
  const body = points.waypointsOnly
    ? points.map(p => `    <wpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele || 0}</ele></wpt>`).join('\n')
    : `    <trk><name>Ruta convertida</name><trkseg>\n${points.map(p =>
        `      <trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele || 0}</ele></trkpt>`).join('\n')}\n    </trkseg></trk>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Rutas Enduro" xmlns="http://www.topografix.com/GPX/1/1">\n${body}\n</gpx>\n`;
}

async function unzipKml(buffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw Error('Archivo KMZ no válido.');
  let at = view.getUint32(end + 16, true);
  const total = view.getUint16(end + 10, true);
  for (let n = 0; n < total; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true), size = view.getUint32(at + 20, true);
    const uncompressed = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buffer, at + 46, nameLen));
    if (name.toLowerCase().endsWith('.kml')) {
      if (uncompressed > 15_000_000) throw Error('El KML supera el límite de 15 MB.');
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const bytes = new Uint8Array(buffer, start, size);
      if (method === 0) return new TextDecoder().decode(bytes);
      if (method === 8) {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return await new Response(stream).text();
      }
      throw Error('Compresión KMZ no compatible.');
    }
    at += 46 + nameLen + extra + comment;
  }
  throw Error('No se encontró un archivo KML en el KMZ.');
}

export async function readRouteFile(file) {
  if (file.size > 10_000_000) throw Error('El archivo debe ocupar menos de 10 MB.');
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['gpx', 'kml', 'kmz'].includes(ext)) throw Error('Selecciona un archivo GPX, KML o KMZ.');
  const xml = ext === 'kmz' ? await unzipKml(await file.arrayBuffer()) : await file.text();
  const points = parsePoints(xml);
  const stats = routeStats(points);
  const converted = ext !== 'gpx';
  const output = converted ? pointsToGpx(points) : await file.text();
  const data = converted
    ? `data:application/gpx+xml;charset=utf-8,${encodeURIComponent(output)}`
    : await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(Error('No se pudo leer el archivo'));
        r.readAsDataURL(file);
      });
  const base = file.name.replace(/\\.(?:kml|kmz|gpx)$/i, '');
  return {
    file: data,
    filename: converted ? `${base}.gpx` : file.name,
    points: points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 10000)) === 0),
    waypointsOnly: Boolean(points.waypointsOnly),
    ...stats
  };
}

const cache = new Map();

export async function mountMaps(routes) {
  for (const el of document.querySelectorAll('.map')) {
    const route = routes.find(r => r.id === el.dataset.routeId);
    try {
      let points = route.points;
      if (!points && route.file) {
        if (cache.has(route.file)) points = cache.get(route.file);
        else {
          const response = await fetch(route.file);
          if (!response.ok) throw Error('No se pudo abrir el archivo');
          points = parsePoints(await response.text());
          cache.set(route.file, points);
        }
      }
      if (!el.isConnected) return;
      const map = L.map(el, { scrollWheelZoom: false }).setView(route.mapCenter || [43.15, -4.01], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      if (points?.length) {
        if (points.waypointsOnly || route.waypointsOnly) {
          points.forEach(p => L.marker([p.lat, p.lon]).addTo(map));
          map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lon])), { padding: [20, 20] });
        } else {
          const line = L.polyline(points.map(p => [p.lat, p.lon]), { color: '#f96915', weight: 3 }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [20, 20] });
        }
      }
      new ResizeObserver(() => { if (el.isConnected) map.invalidateSize(); }).observe(el);
    } catch {
      el.textContent = 'No se pudo cargar el mapa de la ruta.';
    }
  }
}





