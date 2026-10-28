import {normalize,documentSignature} from "./../../../core.mjs";import {assessDocument,VERSION} from "./contract.mjs";
export function freshAnalysis(doc,a){if(a?.phraseVersion!==VERSION||a.signature!==documentSignature(doc))throw Error('PHRASE_SOURCE_BINDING_REQUIRED');return assessDocument(doc,a.rawProposal,a.documentId,a.source);}
export function guardPlan(plan){
 const a=plan.analysis;if(a.phraseVersion!==VERSION)throw Error('PHRASE_REVIEW_REQUIRED');
 const human=new Set(plan.human.filter(h=>h.value!==null&&normalize(h.field,h.entered)===h.value).map(h=>h.field));
 const questions=plan.questions.map(q=>({...q,source:'code'}));
 for(const q of a.codeQuestions){const hard=q.field==='sourceReview'||q.code==='UNSUPPORTED_CURRENCY_KRW_ONLY';if(hard||!human.has(q.field))if(!questions.some(x=>x.field===q.field&&x.code===q.code))questions.push(q);}
 return {...plan,questions,canConfirm:plan.canConfirm&&questions.length===0,reviewProvenance:{contract:VERSION,responseSource:a.source,candidateDocumentPass:a.candidateDocumentPass,modelWholeResponsePass:false,actualModelVerified:false,completion:'UNCONFIRMED',invalidCandidates:a.invalidCandidates,codeQuestions:a.codeQuestions,modelQuestions:a.questionCandidates,invalidModelQuestions:a.invalidModelQuestions,missingModelQuestions:a.missingModelQuestions}};
}
export function recordCompletion(result,plan){const provenance={...plan.reviewProvenance,completion:'HUMAN_CONFIRMED_OFFLINE',humanFields:plan.human.map(h=>h.field)};result.receipt.reviewProvenance=provenance;return result;}
