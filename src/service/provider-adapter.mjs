import fs from 'node:fs';import path from 'node:path';import {requestFor,MODEL} from "./model-contract.mjs";
import {readBounded} from "./vendor/base/server/agent.mjs";
import {digest} from "./vendor/base/server/journal.mjs";
import {requestPayment003 as requestFinalJSON,validatePayment003 as validateReply} from "./profiles/payment-003/phrase-evidence-006/execution-connection/request.mjs";
import {parseFinalContent,contentDiagnostics} from "./provider-content.mjs";
const ENDPOINT='https://api.tokenfactory.nebius.com/v1/chat/completions';
const fail=code=>{throw Object.assign(Error(code),{code});};
export function consumeNewTrialLock(file,metadata){if(!path.isAbsolute(file)||!/^document-meaning-[a-zA-Z0-9-]+$/.test(metadata.trialId))fail('NEW_TRIAL_LOCK_PATH_REQUIRED');const fd=fs.openSync(file,'wx',0o600);try{fs.writeSync(fd,JSON.stringify(metadata)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function baseDocumentAdapter({mode='blocked',journal,key='',approvedHash='',beforeExternal,consumeOnce,testProvider,offlineSource='offline-test-double',fetchImpl=globalThis.fetch,requestProfile='legacy'}={}){
 if(!['legacy','phrase-006'].includes(requestProfile))fail('REQUEST_PROFILE_INVALID');
 let busy=false;
 return {clearKey(){key='';},async run(docs,trialId){
  if(mode==='blocked')fail('DOCUMENT_LIVE_DISABLED');
  if(!/^document-meaning-[a-zA-Z0-9-]+$/.test(trialId))fail('NEW_DOCUMENT_TRIAL_ID_REQUIRED');
  if(busy)fail('DOCUMENT_REQUEST_BUSY');
  busy=true;let request;const outputMaxTokens=requestProfile==='phrase-006'?2048:2048,reservedBudget=8000*300+outputMaxTokens*900;try{request=await(requestProfile==='phrase-006'?requestFinalJSON:requestFor)(docs);if(!journal||typeof journal.reserve!=='function'||typeof journal.finish!=='function')fail('JOURNAL_REQUIRED');
  if(mode==='offline'){if(key||!testProvider)fail('OFFLINE_TEST_PROVIDER_REQUIRED');}
  else if(mode==='approved-live'){if(approvedHash!==request.requestSha256||!beforeExternal||!consumeOnce||!key||! /^[\x21-\x7e]{16,8192}$/.test(key)||/["']/.test(key)||/^Bearer\b/i.test(key))fail('SEPARATE_APPROVAL_OR_KEY_INVALID');if(journal.config?.maxRequests!==1||journal.config?.budgetNanoUsd!==reservedBudget)fail('ONE_TRIAL_BUDGET_REQUIRED');}
  else fail('EXECUTION_MODE_INVALID');
  }catch(e){busy=false;throw e;}
  let reserved=false,httpStatus=null,usage=null,raw=null,analysis=null,error=null,attempts=0,deadline=null,diagnostics=null;
  try{
   if(mode==='approved-live'){beforeExternal();consumeOnce({trialId,requestSha256:request.requestSha256,model:MODEL,inputUpperBound:8000,outputMaxTokens,timeoutMs:45000});}
   journal.reserve({id:trialId,requestHash:request.requestSha256,inputHash:digest(docs),reservedNanoUsd:reservedBudget,estimatedInputTokens:request.inputEstimatedTokens,executionMode:mode==='offline'?'offline-document-test':'live'});reserved=true;
   let response;
   if(mode==='offline')response=await testProvider(request.body);
   else {beforeExternal();attempts=1;const signal=AbortSignal.timeout(45000);deadline=new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('deadline','TimeoutError')),{once:true}));response=await Promise.race([fetchImpl(ENDPOINT,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:request.bodyText,signal}),deadline]);}
   httpStatus=response.status;raw=await(deadline?Promise.race([readBounded(response),deadline]):readBounded(response));
   let envelope;try{envelope=JSON.parse(raw);}catch{fail('PROVIDER_INVALID_JSON');}
   diagnostics=contentDiagnostics(envelope);
   if(envelope.usage&&Number.isSafeInteger(envelope.usage.prompt_tokens)&&envelope.usage.prompt_tokens>=0&&Number.isSafeInteger(envelope.usage.completion_tokens)&&envelope.usage.completion_tokens>=0)usage={prompt_tokens:envelope.usage.prompt_tokens,completion_tokens:envelope.usage.completion_tokens};
   if(!response.ok)fail('NEBIUS_HTTP_'+httpStatus);
   if(envelope.model&&envelope.model!==MODEL)fail('PROVIDER_MODEL_MISMATCH');
   if(usage&&(usage.prompt_tokens>8000||usage.completion_tokens>outputMaxTokens))fail('PROVIDER_USAGE_LIMIT_EXCEEDED');
   const reply=parseFinalContent(envelope);
   analysis=await validateReply(reply,docs,mode==='offline'?offlineSource:'live-provider-response');
  }catch(e){if(!reserved)throw e;error=(typeof e.code==='string'?e.code:null)??(/^MODEL_[A-Z0-9_]+$/.test(e.message)?e.message:null)??(['AbortError','TimeoutError'].includes(e.name)?'NEBIUS_TIMEOUT':'PROVIDER_OR_RESPONSE_VALIDATION_FAILED');}
  finally{try{if(reserved)journal.finish(trialId,{state:error?'error':'success',error,httpStatus,usage,responseHash:raw===null?null:digest(raw)});}finally{busy=false;}}
  const safeRaw=key&&raw?.includes(key)?raw.replaceAll(key,'[REDACTED]'):raw;
  return {source:mode==='offline'?'offline-test-response':'new-live-response',status:error?'FAIL':'PASS',trialId,requestSha256:request.requestSha256,requestProfile,httpStatus,usage,usageState:usage?'known':'unknown',bill:'unverified',analysis,error,diagnostics,rawResponse:safeRaw,responseSha256:safeRaw===null?null:digest(safeRaw),providerRawSha256:raw===null?null:digest(raw),externalPostAttempts:attempts,automaticRetries:0,mockFallback:false,modelSemanticVerified:false,liveContractValidated:mode==='approved-live'&&!error};
 }};
}

export function createDocumentAdapter(options){const adapter=baseDocumentAdapter(options);return {clearKey:()=>adapter.clearKey(),async run(docs,id){const r=await adapter.run(docs,id),p=await requestFinalJSON(docs);return {...r,status:r.status==="PASS"?"REVIEWABLE_DRAFT":r.status,sourceBindings:p.sources.map(s=>({id:s.id,sha256:s.sourceSha256})),candidateSetPass:Array.isArray(r.analysis)&&r.analysis.every(a=>a.candidateDocumentPass),actualModelVerified:false,modelWholeResponsePass:false};}};}
