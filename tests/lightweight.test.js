import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('lightweight entry preserves workspace DOM contracts without the world',async()=>{
 const [html,workspace,accounts]=await Promise.all([read('lite.html'),read('src/workspace.js'),read('src/accounts.js')]);
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate IDs break wallet and agreement handlers');
 for(const id of ['workspace','studio-workspace-panel','studio-create','studio-dialog','studio-connect','studio-import','studio-refresh','studio-list','studio-detail','studio-status','wallet-address','account-dialog','account-connect','account-register','account-session'])assert.ok(ids.includes(id),id);
 for(const m of workspace.matchAll(/\$\('(studio-[^']+)'\)/g)){
  if(workspace.includes('id="'+m[1]+'"')||['studio-project-link','studio-proof','studio-verify-text'].includes(m[1]))continue;
  assert.ok(ids.includes(m[1]),'missing required workspace element '+m[1]);
 }
 assert.ok(!ids.includes('studio-room'));
 assert.doesNotMatch(html,/<(?:img|canvas)\b|src="[^"]*(?:boot|motion)\.js"/);
 assert.match(html,/data-workspace-mode="lite"/);
 assert.ok(accounts.includes("workspaceMode!=='lite')import('./three-feedback.js')"));
 assert.ok(!workspace.includes("import './world-form-scenes.js'"));
});
test('lightweight module has no static dependency on visual world modules',async()=>{
 const visited=new Set();async function visit(path){
  if(visited.has(path))return;visited.add(path);
  assert.doesNotMatch(path,/studio-room|studio-shell|world-form-scenes|three-feedback|material-scene|backdrop/);
  const code=await read(path);
  for(const match of code.matchAll(/(?:^|\n)import\s+(?:[^'";\n]+?\s+from\s+)?['"]([^'"]+)['"]/g)){
   const spec=match[1];assert.notEqual(spec,'three');
   if(spec.startsWith('./')&&spec.endsWith('.js'))await visit('src/'+spec.slice(2));
  }
 }
 await visit('src/lite.js');
 await visit('src/workspace.js');
 assert.ok(visited.has('src/accounts.js'));
});