import fs from 'node:fs';
const dir=new URL('../dist/assets/',import.meta.url);
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
const matches=files.filter(f=>/LOCAL TEST WALLET|createDisposableWallets|Friendbot could not fund/.test(fs.readFileSync(new URL(f,dir),'utf8')));
if(matches.length)throw Error('Disposable signer leaked into production bundle: '+matches.join(','));
console.log('PASS: disposable signer and local lab excluded from production JS.');
