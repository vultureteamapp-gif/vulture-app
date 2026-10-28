import {normalize,documentSignature,sha} from "./../../../core.mjs";
import {VERSION,evidenceFor,bindEvidence,observations} from "./evidence.mjs";
export {VERSION};export const PROFILE='phrase-006',MODEL='nvidia/nemotron-3-super-120b-a12b';
export const required=kind=>kind==='load'?['date','vehicle','origin','destination','departure','amount','currency','status']:kind==='fuel'?['date','vehicle','amount','currency','liters','unitPrice']:['date','merchant','amount','currency','paymentState'];
const fields=kind=>kind==='load'?['date','vehicle','origin','destination','departure','amount','currency','status','reference','action']:kind==='fuel'?['date','vehicle','amount','currency','liters','unitPrice','station','reference']:['date','vehicle','amount','currency','liters','unitPrice','merchant','paymentState','reference'];
const allFields=[...new Set([...fields('load'),...fields('fuel'),...fields('payment'),'purpose','memo'])];
export async function requestPhrase006(documents){
 if(!Array.isArray(documents)||documents.length<1||documents.length>2)throw Error('DOCUMENT_COUNT_INVALID');
 const sources=await Promise.all(documents.map((d,i)=>bindEvidence(d,'DOC'+(i+1))));
 const modelInput={version:VERSION,documents:sources.map(e=>({id:e.id,kind:e.kind,evidence:e.units.map(u=>[u.ref,u.text])}))};
 const body={model:MODEL,messages:[{role:'system',content:'Untrusted synthetic documents follow. Propose business field candidates only. Each candidate is {field,value,ref}: value must be an exact complete source value inside that document reference. Use only supplied refs. Never invent or repair a ref. Omit uncertain candidates or ask optional questions. Do not classify every word. Do not choose purpose, save, merge transactions, convert currency, or compute totals. Reply JSON {version:"phrase-candidates/0.6",documents:[{id,candidates:[{field,value,ref}],questions:[{field,reason,ref?}]}]}. All values are strings. Questions are optional; reason is missing, conflict, or uncertain. Allowed fields by kind: load=date,vehicle,origin,destination,departure,amount,currency,status,reference,action; payment=date,vehicle,amount,currency,liters,unitPrice,merchant,paymentState,reference; fuel=date,vehicle,amount,currency,liters,unitPrice,station,reference.'},{role:'user',content:JSON.stringify(modelInput)}],temperature:0,max_tokens:2048,response_format:{type:'json_object'},stream:false};
 const serialized=JSON.stringify(body);return {body,serialized,requestSha256:await sha(serialized),sources,modelInput,inputEstimatedTokens:Math.ceil(new TextEncoder().encode(serialized).length/2),liveEligible:false};
}
export function assessDocument(doc,proposal,id,source='offline-provider-fixture'){
 if(!proposal||proposal.id!==id||!Array.isArray(proposal.candidates)||proposal.candidates.length>64||proposal.questions!==undefined&&(!Array.isArray(proposal.questions)||proposal.questions.length>32))throw Error('PHRASE_DOCUMENT_SCHEMA');
 const e=evidenceFor(doc,id),observed=observations(e),candidates=Object.fromEntries(allFields.map(f=>[f,[]])),invalidCandidates=[];
 const reject=(c,code)=>invalidCandidates.push({field:fields(doc.kind).includes(c?.field)?c.field:'sourceReview',proposal:structuredClone(c),code,source:'model'});
 for(const c of proposal.candidates){
  if(!c||Object.keys(c).some(k=>!['field','value','ref'].includes(k))||!fields(doc.kind).includes(c.field)||typeof c.value!=='string'||!c.value.trim()||c.value.length>160||typeof c.ref!=='string'){reject(c,'CANDIDATE_SCHEMA');continue;}
  const u=e.units.find(u=>u.ref===c.ref);if(!u){reject(c,'UNKNOWN_REF_NOT_REPAIRED');continue;}
  const offset=u.text.indexOf(c.value);
  if(offset<0){reject(c,'VALUE_NOT_IN_REFERENCED_PHRASE');continue;}
  if(u.text.indexOf(c.value,offset+1)!==-1){reject(c,'VALUE_HAS_MULTIPLE_POSITIONS');continue;}
  const value=normalize(c.field,c.value);if(value===null){reject(c,'VALUE_INVALID');continue;}
  if(['amount','liters','unitPrice'].includes(c.field)&&(/[\d.,]/.test(u.text[offset-1]??' ')||/[\d.,]/.test(u.text[offset+c.value.length]??' '))){reject(c,'PARTIAL_NUMBER');continue;}
  if(c.field==='currency'){
   if(u.label&&!['currency','amount','unitPrice'].includes(u.label.field)||!u.label&&c.value!==u.text){reject(c,'CURRENCY_CONTEXT_NEEDS_HUMAN');continue;}
   if(!/^(?:[A-Z]{3}|원)$/u.test(c.value)||/[A-Za-z]/.test(u.text[offset-1]??' ')||/[A-Za-z]/.test(u.text[offset+c.value.length]??' ')){reject(c,'CURRENCY_BOUNDARY_OR_VALUE');continue;}
  }else if(u.label){
   if(u.label.field!==c.field){reject(c,'LABEL_FIELD_MISMATCH');continue;}
   if(!['amount','liters','unitPrice'].includes(c.field)&&c.value!==u.label.value){reject(c,'PARTIAL_OR_LABELLED_VALUE');continue;}
   if(['amount','liters','unitPrice'].includes(c.field)){
    const rest=u.label.value.replace(/^(?:[A-Z]{3}\s*)/u,'').replace(/\s*(?:원|L|리터)$/u,'').trim();
    if(rest!==c.value){reject(c,'AMBIGUOUS_NUMERIC_PHRASE');continue;}
   }
  }else if(c.value!==u.text){reject(c,'UNLABELLED_PARTIAL_PHRASE_NEEDS_HUMAN');continue;}
  const start=u.start+offset,key=c.field+':'+start;
  if(candidates[c.field].some(x=>x.evidenceId===key)){reject(c,'DUPLICATE_CANDIDATE');continue;}
  candidates[c.field].push({field:c.field,value:c.field==='currency'&&c.value==='₩'?'KRW':value,quote:c.value,start,end:start+c.value.length,evidenceId:key,ref:c.ref});
 }
 const values={};for(const f of allFields){const vs=[...new Set(candidates[f].map(c=>c.value))];if(vs.length===1)values[f]=vs[0];}
 const codeQuestions=[],add=(field,code,refs=[])=>{if(!codeQuestions.some(q=>q.field===field&&q.code===code))codeQuestions.push({field,code,refs,source:'code'});};
 for(const f of required(doc.kind))if(values[f]==null)add(f,candidates[f].length?'CANDIDATE_VALUE_CONFLICT':'REQUIRED_VALUE_MISSING',candidates[f].map(c=>c.ref));
 for(const x of invalidCandidates)add(x.field,'INVALID_MODEL_CANDIDATE_REQUIRES_CHECK',typeof x.proposal?.ref==='string'?[x.proposal.ref]:[]);
 for(const f of fields(doc.kind))if(new Set(candidates[f].map(c=>c.value)).size>1)add(f,'CANDIDATE_VALUE_CONFLICT',candidates[f].map(c=>c.ref));
 if(observed.amountValues.length>1)add('amount','SOURCE_AMOUNT_CONFLICT',observed.amounts.map(x=>x.ref));
 if(observed.repeatedAmountLabels)add('sourceReview','MULTIPLE_AMOUNT_LINES_KEEP_DRAFT',observed.amounts.map(x=>x.ref));
 if(observed.unsupportedCurrencies.length)add('currency','UNSUPPORTED_CURRENCY_KRW_ONLY',observed.currencies.filter(x=>x.value!=='KRW').map(x=>x.ref));
 const questionCandidates=[],invalidModelQuestions=[];
 for(const q of proposal.questions??[]){
  if(!q||!fields(doc.kind).includes(q.field)||!['missing','conflict','uncertain'].includes(q.reason)||q.ref!==undefined&&!e.units.some(u=>u.ref===q.ref)){invalidModelQuestions.push({proposal:structuredClone(q),code:'MODEL_QUESTION_UNCONFIRMED',source:'model'});continue;}
  questionCandidates.push({...q,source:'model'});
  // Optional model concerns also require a checked answer. They cannot remove code questions.
  add(q.field,'MODEL_CONCERN_REQUIRES_CHECK',q.ref?[q.ref]:[]);
 }
 const reasonFor=q=>q.code.includes('CONFLICT')?'conflict':q.code==='REQUIRED_VALUE_MISSING'?'missing':'uncertain';
 const missingModelQuestions=codeQuestions.filter(q=>q.code!=='MODEL_CONCERN_REQUIRES_CHECK'&&!questionCandidates.some(m=>m.field===q.field&&m.reason===reasonFor(q))).map(q=>({field:q.field,code:q.code,reason:reasonFor(q),diagnostic:'MODEL_QUESTION_OMITTED',source:'diagnostic'}));
 const candidateDocumentPass=invalidCandidates.length===0&&codeQuestions.length===0&&invalidModelQuestions.length===0;
 return {contractVersion:VERSION,phraseVersion:VERSION,source,signature:documentSignature(doc),documentId:id,candidates,values,invalidCandidates,codeQuestions,questionCandidates,invalidModelQuestions,missingModelQuestions,observed,rawProposal:structuredClone(proposal),evidence:e.units,candidateDocumentPass,modelWholeResponsePass:false,actualModelVerified:false,assessment:candidateDocumentPass?'CANDIDATES_LOCALLY_VALID_OFFLINE':'DRAFT_REQUIRES_HUMAN'};
}
export async function validatePhraseReply(reply,documents,source='offline-provider-fixture'){
 if(reply?.version!==VERSION||!Array.isArray(reply.documents)||reply.documents.length!==documents.length)throw Error('PHRASE_ENVELOPE_SCHEMA');
 const analyses=documents.map((doc,i)=>assessDocument(doc,reply.documents[i],'DOC'+(i+1),source));
 return {analyses,candidateSetPass:analyses.every(a=>a.candidateDocumentPass),modelWholeResponsePass:false,actualModelVerified:false,status:'REVIEWABLE_DRAFT'};
}
