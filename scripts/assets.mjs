import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('assets',{recursive:true});
const fontUrl='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap';
const response=await fetch(fontUrl,{headers:{'User-Agent':'Mozilla/5.0'}});
if(!response.ok) throw Error('No se pudieron descargar las fuentes');
let css=await response.text();
for(const [index,url] of [...new Set([...css.matchAll(/url\((https[^)]+)\)/g)].map(m=>m[1]))].entries()){
 const file=`font-${index}.woff2`;const r=await fetch(url);if(!r.ok)throw Error('Fuente no disponible');await writeFile(`assets/${file}`,Buffer.from(await r.arrayBuffer()));css=css.split(url).join(`/assets/${file}`);
}
await writeFile('assets/fonts.css',css);
const logo=await fetch('https://media.base44.com/images/public/6a99c4d2b8482bdba0cd4516/1385aeb50_jard_enduro.jpg/v1/fill/w_62,h_62,al_c,q_90,usm_0.66_1.00_0.01,enc_webp,quality_auto/1385aeb50_jard_enduro.webp');
if(!logo.ok)throw Error('Logo no disponible');await writeFile('assets/logo.webp',Buffer.from(await logo.arrayBuffer()));
console.log('Fuentes y logo guardados en local.');
