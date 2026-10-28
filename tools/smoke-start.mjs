// Only new source-package startup wiring. Does not repeat human workflow or the model trial.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import {spawnSync} from 'node:child_process';
import {startHosted} from '../dist/server.mjs';import {provisionState} from '../dist/state-api.mjs';
import {startExecutionServer} from '../dist/real/server.mjs';
delete process.env.NEBIUS_API_KEY;delete process.env.QLOO_API_KEY;
const root=path.resolve(import.meta.dirname,'..'),nativeFetch=globalThis.fetch;let outside=0,app,real;
globalThis.fetch=(url,options)=>{if(new URL(url).hostname!=='127.0.0.1'){outside++;throw Error('PACKAGING_SMOKE_EXTERNAL_NETWORK_DENIED');}return nativeFetch(url,options);};
const evidence=path.resolve(root,'../source-package-smoke.json');
const result={scope:'SOURCE-ONLY INSTALL/BUILD/START DELTA; NOT A MODEL OR HUMAN WORKFLOW RETEST',externalModelCalls:0,externalNetworkAttempts:0,sourceOnly:true,checks:[]};
try{
 const stateRoot=path.resolve(root,'../source-package-state');provisionState(stateRoot);
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const origin='http://127.0.0.1:'+port,secret=randomBytes(32).toString('hex');
 app=await startHosted({stateRoot,runtimeRoot:path.join(root,'dist/runtime-root'),publicDir:path.join(root,'dist/public'),origin,port,host:'127.0.0.1',accessSecret:secret,localTest:true});
 const login=await fetch(origin+'/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({passphrase:secret})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0],headers={Cookie:cookie};
 const page=await fetch(origin+'/inbox?channel=real',{headers});assert.equal(page.status,200);result.checks.push('SOURCE_BUILT_HOSTED_PAGE_HTTP_200');
 const status=await (await fetch(origin+'/api/document/status',{headers})).json();assert.equal(status.keyPresent,false);assert.equal(status.liveReady,false);assert.equal(status.spent,true);result.checks.push('KEYLESS_HOSTED_ORIGINAL_006_CONSUMED');
 const saved=await (await fetch(origin+'/api/document/last?actor=synthetic-driver&channel=real',{headers})).json();assert.equal(saved.source,'new-live-response');assert.equal(saved.displayMode,'saved-response-replay');assert.equal(saved.newExternalCall,false);result.checks.push('SOURCE_BUILT_SAVED_REAL_RESPONSE_READ_ONLY');
 real=await startExecutionServer({port:0,stateRoot:path.join(root,'dist/real/service-state')});
 for(const route of ['/inbox?channel=real','/document.js','/document.css'])assert.equal((await fetch(real.origin+route)).status,200);
 const realStatus=await (await fetch(real.origin+'/api/document/status')).json();assert.equal(realStatus.keyPresent,false);assert.equal(realStatus.liveReady,false);result.checks.push('SOURCE_BUILT_EXISTING_REAL_SERVER_UI_STARTS_WITHOUT_KEYS');
 const preflight=spawnSync(process.execPath,[path.join(root,'dist/real/preflight.mjs')],{encoding:'utf8',env:{...process.env,NEBIUS_API_KEY:'',QLOO_API_KEY:''}});
 assert.equal(preflight.status,1);assert.match(preflight.stderr,/BLOCKED_006_NO_VALID_APPROVAL_OR_UNSPENT_BINDING/);result.checks.push('PACKAGED_REAL_PREFLIGHT_BLOCKS_WITHOUT_NEW_APPROVAL');
 assert.equal(fs.existsSync(path.join(root,'dist/real/approval.USER.json')),false);assert.equal(fs.existsSync(path.join(root,'dist/real/trial-provisioned.lock')),false);result.checks.push('NO_NEW_LIVE_AUTHORITY_CREATED');
 result.status='PASS';
}catch(e){result.status='FAIL';result.error=e.code??e.message;process.exitCode=1;}
finally{if(real)await real.close();if(app)await app.close();globalThis.fetch=nativeFetch;result.externalNetworkAttempts=outside;fs.writeFileSync(evidence,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));}
