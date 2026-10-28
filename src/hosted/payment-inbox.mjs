import {matchVehicleFromReceipt,extractCardLastFour} from "./vendor/receipt-match.ts";
export const paymentExample='SYNTHETIC CARD PAYMENT\nDate: 2026-10-22\nMerchant: Synthetic Roadside Cafe\nAmount: KRW 12,000\nPayment status: approved\nReference: DEMO-MEAL-1\nCard: **1122';
export const paymentFields=['merchant','paymentState','purpose','memo'];
const rules={date:/^(?:Date|날짜)\s*:\s*([^\r\n]+)/gim,merchant:/^(?:Merchant|가맹점|상호)\s*:\s*([^\r\n]+)/gim,amount:/^(?:Amount|Total|금액|총액)\s*:\s*(?:(?:KRW|USD)\s*)?([0-9][0-9,.]*)(?:\s*원)?\s*$/gim,currency:/\b(KRW|USD)\b|(원)(?=\s*(?:\r?\n|$))/gim,dateTime:/^(?:Time|시각)\s*:\s*([^\r\n]+)/gim,reference:/^(?:Reference|승인번호)\s*:\s*([^\r\n]+)/gim,paymentState:/^(?:Payment status|결제상태)\s*:\s*([^\r\n]+)/gim,vehicle:/^(?:Vehicle|차량)\s*:\s*([^\r\n]+)/gim,liters:/^(?:Liters|리터)\s*:\s*([0-9][0-9,.]*)\s*(?:L|리터)?\s*$/gim,unitPrice:/^(?:Unit price|단가)\s*:\s*(?:KRW\s*)?([0-9][0-9,.]*)\s*$/gim};
export function paymentAnalysis(d,kit){
 if(d.syntheticOnly!==true||typeof d.text!=='string'||!d.text.length||d.text.length>10000)throw Error('SYNTHETIC_INPUT_REQUIRED');
 const candidates=Object.fromEntries(kit.FIELDS.map(f=>[f,[]]));
 for(const [field,rule]of Object.entries(rules)){if(!candidates[field])continue;for(const m of d.text.matchAll(rule)){const quote=(m[1]??m[2]).trim(),start=m.index+m[0].lastIndexOf(quote);candidates[field].push({field,value:kit.normalize(field,quote),quote,start,end:start+quote.length});}}
 const values={};for(const [f,cs]of Object.entries(candidates)){const vs=[...new Set(cs.map(c=>c.value).filter(x=>x!==null))];if(vs.length===1)values[f]=vs[0];}
 const match=matchVehicleFromReceipt({cardLastFour:extractCardLastFour(d.text),vehicles:[{id:'DEMO-TRUCK-1',plate_number:'SYNTHETIC-1',card_last_four:'1122'},{id:'DEMO-TRUCK-2',plate_number:'SYNTHETIC-2',card_last_four:'3344'}]});
 return {contractVersion:kit.VERSION,source:'local-template-rules',signature:kit.documentSignature(d),candidates,values,vehicleSuggestion:match.vehicleId||null};
}
export function paymentPlan(d,answers,store,decision,interpreted,kit){
 const a=interpreted?kit.checkInterpreted(d,interpreted):paymentAnalysis(d,kit),v={...a.values},human=[];
 for(const [f,value]of Object.entries(answers??{})){if(!kit.FIELDS.includes(f))throw Error('ANSWER_FIELD_DENIED');if(String(value).trim()){v[f]=kit.normalize(f,value);human.push({field:f,value:v[f],entered:String(value)});}}
 const questions=[],ask=(field,code)=>questions.push({field,code});
 for(const h of human)if(h.value===null)ask(h.field,'invalid-user-answer');
 if(!human.some(h=>h.field==='purpose')||!['fuel','expense','personal'].includes(v.purpose))ask('purpose','PURPOSE_REQUIRED');
 for(const f of ['date','merchant','amount','currency','paymentState'])if(v[f]==null)ask(f,a.candidates[f].length>1?'conflict':'missing-or-invalid');
 if(v.currency&&v.currency!=='KRW'||a.candidates.currency.some(c=>c.value!=='KRW'))ask('currency','KRW_ONLY_NO_CONVERSION');
 if(v.paymentState&&v.paymentState!=='approved'||/partial|refund|revers|cancel|부분취소|취소|환불/i.test(d.text))ask('paymentState','REFUND_NOT_SUPPORTED_KEEP_DRAFT');
 if(/(?:Time|시각)\s*:\s*24:00/i.test(d.text))ask('date','MIDNIGHT_DATE_REQUIRES_CHECK');
 if(questions.some(q=>q.code==='MIDNIGHT_DATE_REQUIRES_CHECK')&&human.some(h=>h.field==='date'&&h.value))questions.splice(questions.findIndex(q=>q.code==='MIDNIGHT_DATE_REQUIRES_CHECK'),1);
 const privateOnly=v.purpose==='personal';
 if(!privateOnly&&!human.some(h=>h.field==='vehicle'&&h.value))ask('vehicle','VEHICLE_CHECK_REQUIRED');
 if(v.purpose==='fuel')for(const f of ['liters','unitPrice'])if(v[f]==null)ask(f,'missing-or-invalid');
 if(v.purpose==='fuel'&&v.liters&&v.unitPrice&&v.amount){const input=kit.validateSnapshot({schema:'vulture-synthetic-v1',actor:'synthetic-admin',dispatches:[],fuelings:[{id:'F1',date:v.date,amount:v.amount,liters:v.liters,unitPrice:v.unitPrice}],expenses:[]});if(kit.deterministicReview(input).findings.some(f=>f.code==='FUEL_ARITHMETIC'))for(const f of ['amount','liters','unitPrice'])ask(f,'fuel-amount-conflict');}
 const collection=privateOnly?(store.documentInbox?.privatePayments??[]):[...(store.fuelings??[]).map(r=>({...r,collection:'fuelings'})),...(store.expenses??[]).map(r=>({...r,collection:'expenses'}))];
 const duplicates=collection.filter(r=>r.date===v.date&&(privateOnly||r.vehicleNumber===v.vehicle)&&r.amount===v.amount).map(r=>({id:r.id,date:r.date,amount:r.amount,vehicle:r.vehicleNumber,reference:r.documentReference??null,collection:r.collection??'privatePayments',reason:'Equal amount/date is only a candidate; check proof identity.'}));
 if(duplicates.length&&!['independent',...duplicates.map(r=>'link:'+r.id)].includes(decision))ask('duplicateDecision','explicit-link-or-separate-required');
 if(decision.startsWith('link:')&&!duplicates.some(r=>decision==='link:'+r.id))throw Error('LINK_TARGET_MISMATCH');
 if(decision.startsWith('link:')){const target=duplicates.find(r=>decision==='link:'+r.id);if((v.purpose==='fuel')!==(target.collection==='fuelings')&&!privateOnly)ask('purpose','LINK_PURPOSE_CONFLICT');}
 const sourceSignature=a.signature,sourceAlreadyConfirmed=(store.documentInbox?.confirmations??[]).some(c=>c.sourceSignature===sourceSignature);
 return {operation:'new',privateOnly,analysis:a,values:v,human,questions,duplicates,decision,sourceAlreadyConfirmed,canConfirm:!questions.length&&!sourceAlreadyConfirmed,sourceSignature,baseStoreSignature:kit.sig(store),planSignature:kit.sig({doc:sourceSignature,values:v,human,decision})};
}
export function paymentApply(store,plan,d,options,kit){
 const {id,now,actor,reviewed}=options;if(!['synthetic-admin','synthetic-driver'].includes(actor)||reviewed!==true)throw Error('USER_CONFIRMATION_REQUIRED');
 if(plan.sourceSignature!==kit.documentSignature(d)||plan.baseStoreSignature!==kit.sig(store))throw Error('STALE_PREVIEW');
 const current=paymentPlan(d,Object.fromEntries(plan.human.map(h=>[h.field,h.entered])),store,plan.decision,plan.analysis,kit);
 if(current.planSignature!==plan.planSignature||!current.canConfirm)throw Error('PLAN_NOT_READY');
 const next=structuredClone(store),v=plan.values,meta=next.documentInbox??{schema:kit.VERSION,actor,confirmations:[]};if(meta.schema!==kit.VERSION||meta.actor!==actor)throw Error('METADATA_SCOPE_MISMATCH');
 const privateOnly=plan.privateOnly,key=privateOnly?'privatePayments':v.purpose==='fuel'?'fuelings':'expenses';if(privateOnly)meta.privatePayments??=[];
 const rows=privateOnly?meta.privatePayments:next[key];let recordId=id,linked=false;
 if(plan.decision.startsWith('link:')){recordId=plan.decision.slice(5);linked=true;}else rows.push(Object.fromEntries(Object.entries({id,date:v.date,amount:v.amount,currency:v.currency,merchant:v.merchant,station:v.purpose==='fuel'?v.merchant:undefined,...(!privateOnly?{vehicleNumber:v.vehicle}:{}),kind:v.purpose==='expense'?'etc':v.purpose,liters:v.purpose==='fuel'?v.liters:undefined,unitPrice:v.purpose==='fuel'?v.unitPrice:undefined,memo:v.memo??'',documentReference:v.reference,createdAt:now}).filter(([,value])=>value!==undefined)));
 const record=rows.find(r=>r.id===recordId);if(!record)throw Error('RECORD_NOT_FOUND');
 meta.confirmations.push({id,actor,sourceSignature:plan.sourceSignature,planSignature:plan.planSignature,sourceText:d.text,kind:'payment',recordCollection:key,private:privateOnly,recordId,linked,operation:'new',at:now,date:v.date,vehicle:privateOnly?null:v.vehicle,recordSignature:kit.sig(record),human:plan.human});next.documentInbox=meta;return {next,receipt:meta.confirmations.at(-1)};
}
