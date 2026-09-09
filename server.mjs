import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initialState} from './src/seed.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.ENDURO_DATA_DIR || path.join(root,'data');
await mkdir(dataDir,{recursive:true});
const dataFile=path.join(dataDir,'state.json');
let state;try{state=JSON.parse(await readFile(dataFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state=initialState();await writeFile(dataFile,JSON.stringify(state,null,2));}
let queue=Promise.resolve();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2','.gpx':'application/gpx+xml','.svg':'image/svg+xml'};
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  if(req.headers.origin && !['http://localhost:'+server.address().port,'http://127.0.0.1:'+server.address().port].includes(req.headers.origin))return send(res,403,{error:'Origen no permitido'});
  if(url.pathname==='/api/state' && req.method==='GET')return send(res,200,state);
  if(url.pathname==='/api/state' && req.method==='PUT'){
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Se requiere JSON'});
   let body='';for await(const part of req){body+=part;if(body.length>20_000_000)return send(res,413,{error:'Los archivos superan el límite de 20 MB'});}
   const next=JSON.parse(body);if(next.version!==1||!Array.isArray(next.trips)||!next.profile||next.trips.some(t=>!t.id||!t.name||!t.start||!['participants','lodgings','expenses','routes'].every(k=>Array.isArray(t[k]))))return send(res,400,{error:'Datos de aplicación no válidos'});
   queue=queue.catch(()=>{}).then(async()=>{await writeFile(dataFile+'.tmp',JSON.stringify(next,null,2));await rename(dataFile+'.tmp',dataFile);state=next;});await queue;return send(res,200,{ok:true});
  }
  return send(res,404,{error:'No encontrado'});
 }
 if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Método no permitido'});
 let pathname=decodeURIComponent(url.pathname);
 if(pathname==='/validation.html'||pathname==='/styles.css'||pathname==='/overrides.css'||pathname.startsWith('/assets/')||pathname.startsWith('/src/')){
  const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep))return send(res,403,{error:'Ruta no permitida'});
  const body=await readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});return res.end(req.method==='HEAD'?undefined:body);
 }
 const html=await readFile(path.join(root,'index.html'));res.writeHead(200,{'Content-Type':types['.html']});res.end(req.method==='HEAD'?undefined:html);
}catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Archivo no encontrado':'No se pudo completar la operación'});}});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Rutas Enduro disponible en http://localhost:${server.address().port}`));
