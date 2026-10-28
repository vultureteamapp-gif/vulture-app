import{storagePrefix}from"./profiles/payment-003/phrase-evidence-006/execution-connection/scope.mjs";

import {setStoreUser,loadStore,saveStore,emptyStore,uid} from "./vendor/base/workspace/src/lib/fleet-store.ts";
import {buildLedger} from "./vendor/base/workspace/src/lib/report-utils.ts";
import {sig,applyPlan,confirmedScope,VERSION} from "./core.mjs";
export const keyFor=(actor:string)=>storagePrefix+'fleet-store-v1:'+actor;
export function readSynthetic(actor:string){
 if(!['synthetic-admin','synthetic-driver'].includes(actor))throw Error('SYNTHETIC_ACTOR_REQUIRED');
 const raw=localStorage.getItem(keyFor(actor));
 if(raw!==null){let j;try{j=JSON.parse(raw);}catch{throw Error('STORAGE_CORRUPT_NO_RESET');}for(const f of ['dispatches','fuelings','expenses','maintenances','overloads'])if(!Array.isArray(j[f]))throw Error('STORAGE_SCHEMA_INVALID');if(j.documentInbox&&(j.documentInbox.schema!==VERSION||j.documentInbox.actor!==actor||!Array.isArray(j.documentInbox.confirmations)))throw Error('STORAGE_SCOPE_INVALID');}
 if(localStorage.getItem(storagePrefix+'fleet-store-v1'))throw Error('UNSCOPED_LEGACY_DATA_NOT_IMPORTED');
 setStoreUser(actor);return raw===null?emptyStore():loadStore();
}
export function commitSynthetic(actor:string,plan:any,doc:any,reviewed:boolean){
 const before=readSynthetic(actor);if(sig(before)!==plan.baseStoreSignature)throw Error('STALE_STORAGE');
 const {next,receipt}=applyPlan(before,plan,doc,{id:'document-'+uid(),now:Date.now(),actor,reviewed});
 if(!saveStore(next))throw Error('SAVE_FAILED_NO_CONFIRMATION');
 const after=readSynthetic(actor);if(sig(after)!==sig(next))throw Error('SAVE_READBACK_MISMATCH');
 return {store:after,receipt};
}
export function dailyReport(store:any,scope:any,lang:string){
 const {selected,summary,receipts}=confirmedScope(store,scope);
 const costs=summary.ledger.entries.map((e:any)=>({id:e.recordId,date:e.date,kind:e.kind??'etc',amount:e.amount}));
 const period={kind:'custom',from:scope.date,to:scope.date,label:scope.date};
 const rows=buildLedger(selected.dispatches,costs,period as any),ko=lang==='ko';
 const money=(n:number)=>'KRW '+n.toLocaleString('en-US');
 return [(ko?'합성 일일보고 — 사용자 확인 기록만':'Synthetic daily report — user-confirmed records only'),scope.date+' | '+scope.vehicle,ko?'출처: 공통 계산·보고 모듈. AI 생성 보고서 아님.':'Source: shared calculation/report modules. Not an AI-generated report.',...rows.map((r:any)=>r.date+' | '+(r.pickup?(r.pickup+' → '+r.dropoff):(ko?r.category:({'주유':'Fuel','기타':'Other expense','식대':'Meal','정비':'Repair','통행료':'Toll',fuel:'Fuel',etc:'Other expense',meal:'Meal',repair:'Repair',toll:'Toll'}[r.category]??r.category??'Expense')))+' | '+money(r.amount)),(ko?'완료 매출':'Completed revenue')+': '+money(summary.revenue),(ko?'주유 포함 지출':'Spending including fuel')+': '+money(summary.expense),(ko?'기록 기준 손익':'Recorded profit')+': '+money(summary.profit),(ko?'확인된 자료 수':'Confirmed source documents')+': '+receipts.length,(ko?'기록된 금액만 반영합니다. 미입력 비용은 포함되지 않습니다. 개인 지출은 제외됩니다.':'Recorded amounts only. Unentered costs are not included. Private payments are excluded.')].join('\n');
}
