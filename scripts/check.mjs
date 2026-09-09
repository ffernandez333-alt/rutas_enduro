import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const file of ['server.mjs',...(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)]){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
for(const file of ['index.html','styles.css','assets/fonts.css','assets/logo.webp'])await readFile(file);
console.log('Comprobación de código y recursos correcta. La aplicación se sirve directamente, sin compilación adicional.');
