// Portable equivalent of the existing key-window server launch/readiness record.
// Server process only; no model request on startup. No approval or key is created here.
import fs from 'node:fs';import path from 'node:path';
import {preflight} from '../dist/real/preflight.mjs';
import {liveController,TRIAL} from '../dist/real/control.mjs';
import {startExecutionServer} from '../dist/real/server.mjs';
if(process.argv[2]!=='--start-separately-approved')throw Error('EXPLICIT_NEW_APPROVAL_SERVER_REQUIRED');
const {prepared}=await preflight();
let key=process.env.NEBIUS_API_KEY??'';delete process.env.NEBIUS_API_KEY;delete process.env.QLOO_API_KEY;
let live,app;
try{
 live=await liveController({root:prepared.runtimeRoot,approvalFile:prepared.approvalFile,stateDir:prepared.stateDir,key});key='';
 app=await startExecutionServer({port:4211,stateRoot:path.join(prepared.runtimeRoot,'service-state'),live});
 fs.writeFileSync(path.join(prepared.runtimeRoot,'key-server-ready.json'),JSON.stringify({trialId:TRIAL,pid:process.pid,port:4211,entry:prepared.runtimeEntry,runtimeRoot:prepared.runtimeRoot,keyPresent:true,liveReady:live.ready(),modelRequestStarted:false,createdAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
 console.log('Separately approved 006 server ready on loopback; no provider call yet.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}catch(e){key='';if(app)await app.close();else live?.close();throw e;}
