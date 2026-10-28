import {sig,sha} from "./../../../../core.mjs";import {parseFinalContent} from "./../../../../provider-content.mjs";
import {requestPayment003,PROFILE} from "./request.mjs";import {validatePhraseReply} from "./../contract.mjs";
export async function acceptWorkflowResult(result,documents){
 if(result?.status!=='REVIEWABLE_DRAFT'||!['offline-test-response','new-live-response'].includes(result.source)||typeof result.rawResponse!=='string')throw Error('PHRASE_RESPONSE_NOT_REVIEWABLE');
 const p=await requestPayment003(documents);if(result.requestProfile!==PROFILE||sig(result.documents)!==sig(documents)||result.requestSha256!==p.requestSha256||sig(result.sourceBindings)!==sig(p.sources.map(s=>({id:s.id,sha256:s.sourceSha256})))||result.responseSha256!==await sha(result.rawResponse))throw Error('PHRASE_RESPONSE_BINDING_MISMATCH');
 const simulation=result.simulation===true,real=result.source==='new-live-response'&&!simulation;
 if(result.source==='new-live-response'&&(!/^[a-f0-9]{64}$/.test(result.executionBindingSha256??'')||result.automaticRetries!==0||result.mockFallback!==false))throw Error('PHRASE_EXECUTION_BINDING_REQUIRED');
 const kind=simulation?'simulated-live-transport':real?'real-provider':'offline-fixture',replay=result.displayMode==='saved-response-replay';
 const source=replay?'saved-'+kind+'-replay':simulation?'simulated-live-transport':real?'live-provider-response':'offline-provider-fixture';
 const checked=await validatePhraseReply(parseFinalContent(JSON.parse(result.rawResponse)),documents,source);
 const transport={kind,replay,simulation,actualProviderResponse:real,executionBindingSha256:result.executionBindingSha256??null,modelWholeResponsePass:real&&checked.candidateSetPass,rawResponseSha256:result.responseSha256};
 const analyses=checked.analyses.map(a=>({...a,executionProvenance:{...transport,candidateDocumentPass:a.candidateDocumentPass}}));
 return {...checked,source,analyses,executionProvenance:transport,modelWholeResponsePass:transport.modelWholeResponsePass,actualModelVerified:transport.modelWholeResponsePass,documents:structuredClone(documents),requestProfile:PROFILE,rawResponse:result.rawResponse};
}
export const runtimeStatus=Object.freeze({newCallsAuthorized:false,automaticRetries:0,actualModelValidated:false});
