import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import http from 'node:http';
import {assertMount,plainPath,provisionState,provisionApprovedTrial} from "./../../../../phrase-evidence-006/pwa-https-006/state.mjs";
export async function main(){
 assertMount();
 if(process.argv.includes('--maintenance')){
  // First deployment has no state yet. A maintenance-only process makes the disk accessible in the Render Shell.
  // It cannot initialize state, accept credentials, expose the app or dispatch any provider request.
  const server=http.createServer((req,res)=>{res.writeHead(req.url==='/health'&&req.method==='GET'?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({maintenance:true,appAvailable:false,providerCalls:false}));});
  await new Promise(r=>server.listen(Number(process.env.PORT??10000),'0.0.0.0',r));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));return;
 }
 const parent='/var/data/vulture',root=parent+'/phrase-006';
 if(!fs.existsSync(parent))fs.mkdirSync(parent,{mode:0o700});plainPath(parent);
 if(process.argv.includes('--approved-trial'))await provisionApprovedTrial(root,path.join(import.meta.dirname,'runtime-root'));
 else if(process.argv.includes('--initialize-offline'))provisionState(root);
 else throw Error('EXPLICIT_INITIALIZATION_OPTION_REQUIRED');
 console.log('Persistent state provisioned. No provider call. Existing state is never reset.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
