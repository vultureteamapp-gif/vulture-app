import {sig} from "./../../../../core.mjs";
import fs from 'node:fs';import path from 'node:path';import * as base from "./../../../../../controller/runtime/trial-final-json-002.mjs";
import {verifyPersistent} from "./../../../../vendor/base/server/persistent-guard.mjs";
import {here,read,writeNew,plain,hash,fail,verifyExecutionPrepared,readBoundApproval,readExecutionApproval,approvalPaths,PIN,TRIAL,MODEL,PROFILE,ENDPOINT,CAPS} from "./binding.mjs";
export {PIN,TRIAL,MODEL,PROFILE,ENDPOINT};export const LIMITS=base.LIMITS,verifyPrepared=verifyExecutionPrepared,readApproval=readExecutionApproval;
export async function provisionTrial({root=here,approvalFile=path.join(here,'approval.USER.json'),stateDir,testOnly=false}={}){
 await verifyPrepared(root);const auth=readApproval(approvalFile,testOnly);if(stateDir!==auth.stateDir)fail('EXACT_006_STATE_PATH_REQUIRED');if(fs.existsSync(auth.stateDir))fail('NEW_006_TRIAL_STATE_REQUIRED');
 writeNew(auth.intent,{trialId:TRIAL,requestSha256:PIN,approvalHash:auth.approvalHash,executionBindingSha256:auth.bindingSha256,simulation:testOnly,createdAt:new Date().toISOString()});
 const result=await base.provisionTrial({root,approvalFile,stateDir,testOnly});writeNew(path.join(stateDir,'execution-binding.json'),{trialId:TRIAL,requestSha256:PIN,approvalHash:auth.approvalHash,executionBindingSha256:auth.bindingSha256,sourceSnapshotSha256:auth.prepared.sourceSnapshotSha256,releaseManifestSha256:auth.releaseManifestSha256});return result;
}
export function inspectState({approvalFile=path.join(here,'approval.USER.json'),testOnly=false,allowMissing=false}={}){
 const paths=approvalPaths(approvalFile,testOnly),exists=[paths.approvalFile,paths.stateDir,paths.intent].map(fs.existsSync);if(exists.every(x=>!x)&&allowMissing)return {approved:false,spent:false,ready:false,simulation:testOnly};if(exists.some(x=>!x))fail('APPROVED_006_STATE_MISSING_FAIL_CLOSED');
 plain(paths.stateDir,'directory');const spentPath=path.join(paths.stateDir,testOnly?'spent.OFFLINE-TEST.lock':'spent.lock'),spent=fs.existsSync(spentPath),auth=readBoundApproval(approvalFile,testOnly,{historical:spent});verifyPersistent(auth.stateDir,auth.approvalHash);
 const intent=read(auth.intent),binding=read(path.join(auth.stateDir,'execution-binding.json'));for(const value of [intent,binding])if(value.trialId!==TRIAL||value.requestSha256!==PIN||value.approvalHash!==auth.approvalHash||value.executionBindingSha256!==auth.bindingSha256)fail('EXECUTION_STATE_BINDING_INVALID');
 if(binding.sourceSnapshotSha256!==auth.prepared.sourceSnapshotSha256||binding.releaseManifestSha256!==auth.releaseManifestSha256)fail('EXECUTION_STATE_BINDING_INVALID');
 const rows=fs.readFileSync(path.join(auth.stateDir,'requests.ndjson'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);if(rows.length&&!spent)fail('SPENT_LOCK_MISSING_FAIL_CLOSED');if(spent)plain(spentPath);
 return {...auth,approved:true,spent,ready:!spent&&!rows.length&&!fs.existsSync(auth.dispatchIntent),simulation:testOnly,spentPath,rows};
}
export async function liveController({root=here,approvalFile=path.join(here,'approval.USER.json'),stateDir,key='',fetchImpl,testOnly=false}={}){
 const auth=inspectState({approvalFile,testOnly});if(stateDir!==auth.stateDir)fail('EXACT_006_STATE_PATH_REQUIRED');if(!auth.ready)fail('TRIAL_ALREADY_SPENT_NO_RETRY');if(!testOnly&&fetchImpl)fail('CUSTOM_LIVE_TRANSPORT_DENIED');
 const controller=await base.liveController({root,approvalFile,stateDir,key,...(testOnly?{fetchImpl,testOnly:true}:{})});let running=false,closed=false;
 // Status is advisory: don't rehash hundreds of preserved files for each UI poll. run() and the base controller still perform full checks before spending/POST.
 return {profile:PROFILE,simulation:testOnly,ready(){try{if(closed||running||fs.existsSync(auth.spentPath)||fs.existsSync(auth.dispatchIntent)||hash(fs.readFileSync(plain(approvalFile)))!==auth.approvalHash||controller.summary().attempts!==0)return false;verifyPersistent(stateDir,auth.approvalHash);return true;}catch{return false;}},async run(docs){
  if(closed)fail('CONTROLLER_CLOSED');
  if(running)fail('DOCUMENT_REQUEST_BUSY');running=true;
  try{const prepared=await verifyPrepared(root),p=await import("./request.mjs").then(m=>m.requestEvidence006(docs));if(p.requestSha256!==PIN||sig(docs)!==sig(prepared.docs))fail('CURRENT_INPUT_NOT_APPROVED');const current=inspectState({approvalFile,testOnly});if(!current.ready||!controller.ready())fail('TRIAL_ALREADY_SPENT_NO_RETRY');
   writeNew(current.dispatchIntent,{trialId:TRIAL,requestSha256:PIN,approvalHash:current.approvalHash,executionBindingSha256:current.bindingSha256,simulation:testOnly,createdAt:new Date().toISOString(),automaticRetries:0});
   const resultDir=path.join(stateDir,'result');fs.mkdirSync(resultDir);writeNew(path.join(resultDir,'request.sent.json'),prepared.request.bodyText);
   const result=await controller.run(docs),value={...result,simulation:testOnly,actualExternalPostAttempts:testOnly?0:result.externalPostAttempts,controllerPostAttempts:result.externalPostAttempts,liveContractValidated:testOnly?false:result.liveContractValidated,modelWholeResponsePass:!testOnly&&result.candidateSetPass===true,actualModelVerified:!testOnly&&result.candidateSetPass===true,executionBindingSha256:current.bindingSha256};
   writeNew(path.join(resultDir,'result.original.json'),value);if(typeof value.rawResponse==='string')writeNew(path.join(resultDir,value.providerRawSha256===value.responseSha256?'provider-response.original.json':'provider-response.redacted.txt'),value.rawResponse);return value;
  }finally{running=false;}
 },anchor:()=>({...controller.anchor(),approvalFile,simulation:testOnly,executionBindingSha256:auth.bindingSha256}),summary:()=>controller.summary(),close(){closed=true;controller.close();}};
}
export function verifyResultAnchor(anchor,result){const auth=inspectState({approvalFile:anchor.approvalFile,testOnly:anchor.simulation===true});if(!auth.spent||auth.stateDir!==anchor.stateDir||auth.approvalHash!==anchor.approvalHash||auth.bindingSha256!==anchor.executionBindingSha256||result.requestProfile!==PROFILE||result.requestSha256!==PIN||result.simulation!==(anchor.simulation===true)||result.executionBindingSha256!==auth.bindingSha256)fail('LIVE_RESULT_EXECUTION_BINDING_INVALID');base.verifyResultAnchor(anchor,result);}
