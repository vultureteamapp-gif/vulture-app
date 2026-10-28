// Exactly one local trigger for the separately authorized external request.
// No key reading; no business save; no retry, fallback or automatic next trial.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';
import{preflight,here,root,read,hash}from"./preflight.mjs";import{verifyResultAnchor,PIN,TRIAL}from"./control.mjs";import{verifyPersistent}from"./../../../../vendor/base/server/persistent-guard.mjs";
import{acceptWorkflowResult}from"./workflow.mjs";
const{prepared,p,a,approvalHash}=await preflight(),ready=read(path.join(here,'key-server-ready.json')),origin='http://127.0.0.1:4211',actor=prepared.actor;
assert.equal(ready.trialId,TRIAL);assert.equal(ready.port,4211);assert.equal(ready.liveReady,true);assert.equal(read(path.join(a.stateDir,'owner.lock')).pid,ready.pid);
const get=async route=>{const r=await fetch(origin+route,{redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);return r.json();},headers={'Content-Type':'application/json',Origin:origin};
const status=await get('/api/document/status');assert.equal(status.requestProfile,'phrase-006');assert.equal(status.uiRevision,'phrase-006');assert.equal(status.liveReady,true);assert.equal(status.approvedRequestSha256,PIN);
const trial=await get('/api/document/trial');assert.deepEqual(trial.documents,p.docs);assert.equal(trial.requestSha256,PIN);
const response=await fetch(origin+'/api/document/prepare',{method:'POST',headers,body:JSON.stringify({actor,documents:p.docs}),redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);const check=await response.json();assert.equal(check.requestSha256,PIN);assert.equal(check.model,a.model);assert.equal(check.outputMaxTokens,2048);assert.equal(check.timeoutMs,45000);assert.equal(check.liveEligible,true);
function write(file,text){const fd=fs.openSync(file,'wx',0o600);try{fs.writeSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
const evidence=path.join(here,'result');assert(!fs.existsSync(evidence),'Prior or uncertain result; never overwrite/retry');fs.mkdirSync(evidence);
write(path.join(evidence,'request.sent.json'),p.request.bodyText);assert.equal(hash(fs.readFileSync(path.join(evidence,'request.sent.json'))),PIN);
const requestId='document-meaning-live-phrase-006',began=new Date().toISOString();
// The provider's separate wx/fsync spent.lock is consumed inside its controller.
write(path.join(here,'operator-dispatch-intent.lock'),JSON.stringify({trialId:TRIAL,requestSha256:PIN,requestId,began,automaticRetries:0}));
let result=null,localHTTP=null,transportError=null,replayVerified=false,anchorError=null,revalidation='NOT RUN',journal=[];
try{
 const actual=await fetch(origin+'/api/document/analyze',{method:'POST',headers,body:JSON.stringify({mode:'live',actor,documents:p.docs,requestSha256:PIN,requestId}),redirect:'error',signal:AbortSignal.timeout(60000)});
 localHTTP=actual.status;const text=await actual.text();write(path.join(evidence,'local-response.original.json'),text);try{result=JSON.parse(text);}catch{transportError='LOCAL_RESPONSE_INVALID_JSON';}
}catch{transportError='LOCAL_TRANSPORT_FAILED_TRANSMISSION_UNKNOWN_NO_RETRY';}
try{
 verifyPersistent(a.stateDir,approvalHash);journal=fs.readFileSync(path.join(a.stateDir,'requests.ndjson'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 if(typeof result?.rawResponse==='string'){
  write(path.join(evidence,result.responseSha256===result.providerRawSha256?'provider-response.original.json':'provider-response.redacted.txt'),result.rawResponse);
  verifyResultAnchor({stateDir:a.stateDir,approvalHash,approvalFile:prepared.approvalFile,simulation:false,executionBindingSha256:hash(fs.readFileSync(path.join(here,"prepared.json")))},result);
  const replay=await get('/api/document/last?actor='+actor+'&channel=real');assert.equal(replay.rawResponse,result.rawResponse);assert.equal(replay.status,result.status);assert.equal(replay.newExternalCall,false);assert.equal(replay.displayMode,'saved-response-replay');replayVerified=true;
  if(result.status==='REVIEWABLE_DRAFT'){await acceptWorkflowResult(result,p.docs);revalidation='REVIEWABLE_DRAFT_NOT_MODEL_PASS';}else revalidation='FAIL_RETAINED';
 }
}catch{anchorError='JOURNAL_REPLAY_OR_CONTRACT_VERIFICATION_FAILED_NO_RETRY';}
const finalStatus=await get('/api/document/status').catch(()=>null),summary={trialId:TRIAL,requestSha256:PIN,began,finished:new Date().toISOString(),localHTTP,httpStatus:result?.httpStatus??null,status:result?.status??'UNKNOWN',error:result?.error??null,usage:result?.usage??null,usageState:result?.usageState??'unknown',actualBill:'UNVERIFIED',estimatedUsageCostUsd:result?.usage?(result.usage.prompt_tokens*.3+result.usage.completion_tokens*.9)/1e6:null,externalPostAttempts:result?.externalPostAttempts??'unknown',reservationCount:journal.filter(r=>r.type==='reserve').length,automaticRetries:0,mockFallback:false,spentLockPreserved:fs.existsSync(path.join(a.stateDir,'spent.lock')),replayVerifiedNoNewCall:replayVerified,postAttemptLiveReady:finalStatus?.liveReady??'unknown',responseRevalidation:revalidation,transportError,anchorError,businessRecordsWritten:0,userConfirmationSaveReport:'NOT RUN',browserVerification:'NOT RUN',realTrialUrl:origin+'/inbox?channel=real'};
write(path.join(here,'actual-call-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(transportError||anchorError||result?.status!=='REVIEWABLE_DRAFT')process.exitCode=2;
