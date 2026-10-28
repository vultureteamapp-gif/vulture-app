import path from 'node:path';
import {createDocumentService as sharedService} from "./../../runtime/document-service.mjs";
// This module is compiled with the explicit phrase-006 overlay, preserving the shared source.
export async function createDocumentService({root,stateRoot,live=null,requestProfile}){
 if(requestProfile!=='phrase-006')throw Error('REQUEST_PROFILE_INVALID');
 const offline=await sharedService({root,stateRoot:path.join(stateRoot,'provider-double-006'),requestProfile});
 let actual;try{actual=await sharedService({root,stateRoot:path.join(stateRoot,'provider-real-006'),live,requestProfile});}catch(e){offline.close();throw e;}
 return {status:()=>({...actual.status(),storageIsolation:'offline and real results/business storage separated',businessLiveVerified:false}),trial:()=>actual.trial(),prepare:body=>actual.prepare(body),run:body=>body.mode==='offline'?offline.run(body):actual.run(body),last:(actor,mode='real')=>mode==='offline'?offline.last(actor):mode==='real'?actual.last(actor):Promise.reject(Error('REPLAY_CHANNEL_INVALID')),close(){offline.close();actual.close();}};
}
