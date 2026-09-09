import {writeFile} from 'node:fs/promises';
const base='https://base44.app/api/apps/6a99c4d2b8482bdba0cd4516/files/mp/public/6a99c4d2b8482bdba0cd4516/';
for(const [name,file] of [['sabado','b9ceb5a9b_Sabado_2_70km.gpx'],['domingo','b58ed2d65_Domingo_58km.gpx'],['lunes','1b3bd074c_Lunes_37km.gpx']]){const r=await fetch(base+file);if(!r.ok)throw Error('No disponible: '+name);const text=await r.text();if(!text.includes('<gpx'))throw Error('GPX no válido');await writeFile('assets/'+name+'.gpx',text);console.log(name+' guardado.');}
