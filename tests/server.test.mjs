import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {routeStats} from '../src/maps.js';
test('La distancia y el desnivel se calculan desde coordenadas reales',()=>{const result=routeStats([{lat:0,lon:0,ele:50},{lat:0,lon:1,ele:150},{lat:0,lon:2,ele:100}]);assert.equal(result.distance,222.4);assert.equal(result.elevation,100);});
test('Persistencia, rutas directas, validación y aislamiento del servidor local',async()=>{const directory=await mkdtemp(path.join(tmpdir(),'enduro-test-'));let proc;
 async function start(){proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,ENDURO_DATA_DIR:directory,PORT:'0'}});return new Promise((resolve,reject)=>{proc.once('error',reject);proc.stdout.on('data',chunk=>{const match=chunk.toString().match(/http:\/\/localhost:(\d+)/);if(match)resolve('http://127.0.0.1:'+match[1]);});proc.stderr.on('data',d=>reject(Error(d.toString())));});}
 async function stop(){if(!proc||proc.exitCode!==null)return;await new Promise(resolve=>{proc.once('exit',resolve);proc.kill();});}
 try{let base=await start();let response=await fetch(base+'/api/state');let state=await response.json();assert.equal(state.trips.length,5);state.trips[0].name='Prueba de persistencia';response=await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});assert.equal(response.status,200);await stop();base=await start();assert.equal((await (await fetch(base+'/api/state')).json()).trips[0].name,'Prueba de persistencia');assert.equal((await fetch(base+'/salida/nueva')).status,200);assert.match(await(await fetch(base+'/salida/nueva')).text(),/Rutas Enduro/);assert.equal((await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);assert.equal((await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(state)})).status,403);assert.equal((await fetch(base+'/assets/no-existe.gpx')).status,404);assert.equal((await fetch(base+'/data/state.json')).headers.get('content-type'),'text/html; charset=utf-8');}
 finally{await stop();await rm(directory,{recursive:true,force:true});}
});
