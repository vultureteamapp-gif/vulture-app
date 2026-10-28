import {paymentAnalysis,paymentPlan,paymentApply,paymentFields,paymentExample} from "./payment-inbox.mjs";

import {validateSnapshot,deterministicReview,canonical} from "./vendor/base/workspace/src/contest/analysis-contract.mjs";
import {summarizeFleet} from "./vendor/base/workspace/src/contest/ledger.mjs";
export const VERSION='document-confirm-002/0.2.0';
export const FIELDS=['date','vehicle','origin','destination','departure','amount','currency','liters','unitPrice','station','reference','status','action',...paymentFields];
export const examples={payment:paymentExample,
load:'SYNTHETIC LOAD MESSAGE\nDate: 2026-10-22\nVehicle: DEMO-TRUCK-1\nFrom: Synthetic Depot A\nTo: Synthetic Depot B\nDeparture: 10:30\nFare: KRW 320,000\nStatus: completed\nReference: DEMO-LOAD-1\nAction: new',
fuel:'SYNTHETIC FUEL RECEIPT\nDate: 2026-10-22\nVehicle: DEMO-TRUCK-1\nStation: Synthetic Fuel Stop\nAmount: KRW 68,000\nLiters: 40\nUnit price: KRW 1,700\nReference: DEMO-PAY-1'
};
export const sig=v=>canonical(v);
export const documentSignature=d=>sig({kind:d.kind,text:d.text,syntheticOnly:d.syntheticOnly});
export async function sha(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const die=code=>{throw Object.assign(Error(code),{code});};
export function normalize(field,quote){
 const s=String(quote).trim();
 if(['amount','unitPrice','liters'].includes(field)){if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))return null;const n=s.replaceAll(',','');const v=Number(n);return Number.isFinite(v)&&v>0&&v<=1e9&&(field==='liters'||Number.isSafeInteger(v))?v:null;}
 if(field==='purpose')return ['fuel','expense','personal'].includes(s)?s:null;
 if(field==='paymentState'){return ({approved:'approved',approval:'approved',승인:'approved',cancelled:'cancelled',canceled:'cancelled',취소:'cancelled',partial:'partial',부분취소:'partial'})[s.toLowerCase()]??null;}
 if(field==='memo')return s.length<=500?s:null;
 if(field==='date')return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:null;
 if(field==='departure')return /^([01]\d|2[0-3]):[0-5]\d$/.test(s)?s:null;
 if(field==='currency')return s==='원'?'KRW':s.toUpperCase();
 if(field==='action'){const x={new:'new',additional:'additional',cancel:'cancel',신규:'new',추가:'additional',취소:'cancel'};return x[s.toLowerCase()]??null;}
 if(field==='status'){const m={완료:'completed',대기:'waiting',취소:'cancelled'};const v=m[s]??s.toLowerCase();return ['waiting','loaded','ongoing','completed','cancelled'].includes(v)?v:null;}
 return s.length>0&&s.length<=160?s:null;
}
const patterns={
date:/^(?:Date|날짜)\s*:\s*([^\r\n]+)/gim,vehicle:/^(?:Vehicle|차량)\s*:\s*([^\r\n]+)/gim,
origin:/^(?:From|출발지|상차지)\s*:\s*([^\r\n]+)/gim,destination:/^(?:To|도착지|하차지)\s*:\s*([^\r\n]+)/gim,
departure:/^(?:Departure|출발시각)\s*:\s*([^\r\n]+)/gim,
amount:/^(?:Fare|Amount|Total|운임|금액|총액)\s*:\s*(?:(?:KRW|USD)\s*)?([0-9][0-9,.]*)(?:\s*원)?\s*$/gim,
currency:/\b(KRW|USD)\b|(원)(?=\s*(?:\r?\n|$))/gim,
liters:/^(?:Liters|리터)\s*:\s*([0-9][0-9,.]*)\s*(?:L|리터)?\s*$/gim,
unitPrice:/^(?:Unit price|단가)\s*:\s*(?:KRW\s*)?([0-9][0-9,.]*)\s*(?:원)?\s*$/gim,
station:/^(?:Station|주유소)\s*:\s*([^\r\n]+)/gim,reference:/^(?:Reference|승인번호)\s*:\s*([^\r\n]+)/gim,action:/^(?:Action|작업)\s*:\s*([^\r\n]+)/gim,status:/^(?:Status|상태)\s*:\s*([^\r\n]+)/gim
};
const paymentKit=()=>({FIELDS,normalize,VERSION,documentSignature,sig,checkInterpreted,validateSnapshot,deterministicReview});
export function analyze(d){
 if(d?.kind==='payment')return paymentAnalysis(d,paymentKit());
 if(!d||!['load','fuel'].includes(d.kind)||d.syntheticOnly!==true||typeof d.text!=='string'||d.text.length<1||d.text.length>10000)die('SYNTHETIC_INPUT_REQUIRED');
 const candidates={};for(const [field,pattern] of Object.entries(patterns)){candidates[field]=[];pattern.lastIndex=0;for(const m of d.text.matchAll(pattern)){const quote=(m[1]??m[2]).trim(),start=m.index+m[0].lastIndexOf(quote);candidates[field].push({field,value:normalize(field,quote),quote,start,end:start+quote.length});}}
 for(const f of FIELDS)candidates[f]??=[];
 const values={};for(const f of FIELDS){const set=[...new Set(candidates[f].map(c=>c.value).filter(v=>v!==null))];if(set.length===1)values[f]=set[0];}
 return {contractVersion:VERSION,source:'local-template-rules',signature:documentSignature(d),candidates,values};
}
const required=kind=>kind==='load'?['date','vehicle','origin','destination','departure','amount','currency','status']:['date','vehicle','amount','currency','liters','unitPrice'];
export function makePlan(d,answers,store,decision='',interpreted=null){
 if(d.kind==='payment')return paymentPlan(d,answers,store,decision,interpreted,paymentKit());
 const a=interpreted?checkInterpreted(d,interpreted):analyze(d),v={...a.values},human=[];
 for(const [field,value] of Object.entries(answers??{})){if(!FIELDS.includes(field))die('ANSWER_FIELD_DENIED');if(String(value).trim()){v[field]=normalize(field,value);human.push({field,value:v[field],entered:String(value)});}}
 const operation=d.kind==='load'&&(v.action==='cancel'||v.status==='cancelled')?'cancel':'new';
 const questions=[];if(a.candidates.action.length&&v.action==null)questions.push({field:"action",code:"ACTION_UNKNOWN_KEEP_DRAFT"});if(d.kind==='fuel'&&/\b(cancelled|canceled|refund|reversed)\b|취소|환불/i.test(d.text))questions.push({field:'status',code:'REFUND_NOT_SUPPORTED_KEEP_DRAFT'});for(const f of (operation==='cancel'?['date','vehicle','reference']:required(d.kind))){if(v[f]==null)questions.push({field:f,code:a.candidates[f].length>1?'conflict':'missing-or-invalid'});}
 if(v.currency&&v.currency!=='KRW')questions.push({field:'currency',code:'KRW_ONLY_NO_CONVERSION'});
 if(a.candidates.currency.some(c=>c.value==='USD'))questions.push({field:'currency',code:'USD_SOURCE_NOT_CONVERTED'});
 if(!questions.length&&operation!=='cancel'){const raw={schema:'vulture-synthetic-v1',actor:'synthetic-admin',dispatches:d.kind==='load'?[{id:'D1',date:v.date,fare:v.amount,status:v.status}]:[],fuelings:d.kind==='fuel'?[{id:'F1',date:v.date,amount:v.amount,liters:v.liters,unitPrice:v.unitPrice}]:[],expenses:[]};const normalized=validateSnapshot(raw);if(d.kind==='fuel'&&deterministicReview(normalized).findings.some(f=>f.code==='FUEL_ARITHMETIC'))for(const field of ['amount','liters','unitPrice'])questions.push({field,code:'fuel-amount-conflict'});}
 const collection=d.kind==='load'?(store.dispatches??[]):(store.fuelings??[]);
 const duplicates=collection.filter(r=>operation==='cancel'?r.documentReference===v.reference&&r.vehicleNumber===v.vehicle:r.date===v.date&&r.vehicleNumber===v.vehicle&&(d.kind==='fuel'?r.amount===v.amount:(r.documentReference&&r.documentReference===v.reference)||(r.pickup===v.origin&&r.dropoff===v.destination&&r.pickupTime===v.departure))).map(r=>({id:r.id,date:r.date,amount:r.amount??r.fare,vehicle:r.vehicleNumber,reference:r.documentReference??null,reason:operation==='cancel'?'exact-reference-vehicle; choose cancellation explicitly':'possible overlap; not proof of identity'}));
 if(operation==='cancel'){if(collection.some(r=>r.documentReference===v.reference&&r.vehicleNumber===v.vehicle&&r.status==='cancelled'))questions.push({field:'status',code:'ALREADY_CANCELLED_KEEP_DRAFT'});if(!duplicates.some(r=>decision==='cancel:'+r.id))questions.push({field:'duplicateDecision',code:'CANCEL_TARGET_CONFIRMATION_REQUIRED'});if(duplicates.length===0)questions.push({field:'reference',code:'CANCEL_TARGET_NOT_FOUND_KEEP_DRAFT'});}
 else if(duplicates.length&&!['independent',...duplicates.map(f=>'link:'+f.id)].includes(decision))questions.push({field:'duplicateDecision',code:'explicit-link-or-separate-required'});
 if(decision.startsWith('link:')&&!duplicates.some(f=>decision==='link:'+f.id))die('LINK_TARGET_MISMATCH');
 if(decision.startsWith('cancel:')&&(operation!=='cancel'||!duplicates.some(f=>decision==='cancel:'+f.id)))die('CANCEL_TARGET_MISMATCH');
 const sourceAlreadyConfirmed=(store.documentInbox?.confirmations??[]).some(c=>c.sourceSignature===a.signature);
 return {operation,analysis:a,values:v,human,questions,duplicates,decision,sourceAlreadyConfirmed,canConfirm:questions.length===0&&!sourceAlreadyConfirmed,sourceSignature:a.signature,baseStoreSignature:sig(store),planSignature:sig({doc:a.signature,values:v,human,decision})};
}
export function applyPlan(store,plan,d,{id,now,actor,reviewed}){
 if(d.kind==='payment')return paymentApply(store,plan,d,{id,now,actor,reviewed},paymentKit());
 if(!['synthetic-admin','synthetic-driver'].includes(actor)||reviewed!==true)die('USER_CONFIRMATION_REQUIRED');
 if(plan.sourceSignature!==documentSignature(d)||plan.baseStoreSignature!==sig(store))die('STALE_PREVIEW');
 const current=makePlan(d,Object.fromEntries(plan.human.map(h=>[h.field,h.entered])),store,plan.decision,plan.analysis);
 if(current.planSignature!==plan.planSignature||!current.canConfirm)die(current.sourceAlreadyConfirmed?'ALREADY_CONFIRMED':'PLAN_NOT_READY');
 const next=structuredClone(store),v=plan.values;let recordId=id,linked=false;
 let previousRecordSignature=null;
 if(plan.operation==='cancel'){recordId=plan.decision.slice(7);const target=next.dispatches.find(r=>r.id===recordId);if(!target)die('CANCEL_TARGET_MISSING');previousRecordSignature=sig(target);target.status='cancelled';target.cancelledAt=now;}
 else if(plan.decision.startsWith('link:')){recordId=plan.decision.slice(5);linked=true;}
 else if(d.kind==='load')next.dispatches.push({id,scheduledDate:v.date,date:v.date,pickup:v.origin,dropoff:v.destination,pickupTime:v.departure,fare:v.amount,status:v.status,vehicleNumber:v.vehicle,...(v.reference?{documentReference:v.reference}:{}),createdAt:now,...(v.status==='completed'?{completedAt:new Date(v.date+'T12:00:00').getTime()}:{}),memo:'Synthetic document confirmation',rawText:d.text});
 else next.fuelings.push({id,date:v.date,vehicleNumber:v.vehicle,...(v.station?{station:v.station}:{}),amount:v.amount,liters:v.liters,unitPrice:v.unitPrice,createdAt:now,...(v.reference?{documentReference:v.reference}:{}),memo:'Synthetic document confirmation'});
 const collection=d.kind==='load'?next.dispatches:next.fuelings,record=collection.find(x=>x.id===recordId);if(!record)die('RECORD_NOT_FOUND');
 const meta=next.documentInbox??{schema:VERSION,actor,confirmations:[]};if(meta.schema!==VERSION||meta.actor!==actor)die('METADATA_SCOPE_MISMATCH');
 meta.confirmations.push({id,actor,sourceSignature:plan.sourceSignature,planSignature:plan.planSignature,sourceText:d.text,kind:d.kind,recordId,linked,operation:plan.operation,previousRecordSignature,at:now,date:v.date,vehicle:v.vehicle,recordSignature:sig(record),human:plan.human});next.documentInbox=meta;
 return {next,receipt:meta.confirmations.at(-1)};
}
export function confirmedScope(store,{date,vehicle,actor}){
 const meta=store.documentInbox;if(meta&&meta.actor!==actor)die('ACTOR_SCOPE_MISMATCH');
 const receipts=(meta?.confirmations??[]).filter(c=>!c.private&&c.date===date&&c.vehicle===vehicle);
 if(!receipts.length)die('NO_CONFIRMED_RECORDS');
 const selected={...store,dispatches:[],fuelings:[],expenses:[],maintenances:[],overloads:[]};
 const latest=new Map();for(const c of receipts)latest.set(c.recordId,c);
 for(const c of latest.values()){const key=c.recordCollection??(c.kind==='load'?'dispatches':'fuelings'),row=store[key].find(r=>r.id===c.recordId);if(!row||sig(row)!==c.recordSignature)die('CONFIRMED_RECORD_CHANGED');if(!selected[key].some(r=>r.id===row.id))selected[key].push(row);}
 return {selected,summary:summarizeFleet(selected),receipts};
}

export function savedReceiptFor(store,doc,receiptId){if(!receiptId)return null;return (store.documentInbox?.confirmations??[]).find(c=>c.id===receiptId&&c.sourceSignature===documentSignature(doc))??null;}

export function checkInterpreted(d,a){if(a.signature!==documentSignature(d)||!a.candidates)die('INTERPRETATION_SOURCE_MISMATCH');const candidates={},values={};for(const field of FIELDS){const cs=a.candidates[field]??[];if(!Array.isArray(cs)||cs.length>32)die('INTERPRETATION_CANDIDATE_LIMIT');for(const c of cs)if(c.field!==field||!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start<0||c.end<=c.start||d.text.slice(c.start,c.end)!==c.quote||normalize(field,c.quote)!==c.value)die('INTERPRETATION_EVIDENCE_INVALID');candidates[field]=cs;const set=[...new Set(cs.map(c=>c.value).filter(v=>v!==null))];if(set.length===1)values[field]=set[0];}return {...a,candidates,values};}
