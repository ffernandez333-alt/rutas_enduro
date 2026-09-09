import {writeFile} from 'node:fs/promises';
for(const file of ['leaflet.js','leaflet.css']){const r=await fetch('https://unpkg.com/leaflet@1.9.4/dist/'+file);if(!r.ok)throw Error('No se pudo obtener Leaflet');await writeFile('assets/'+file,Buffer.from(await r.arrayBuffer()));}
const license=await fetch('https://unpkg.com/leaflet@1.9.4/LICENSE');await writeFile('assets/leaflet-LICENSE.txt',await license.text());
console.log('Leaflet guardado en el proyecto.');
