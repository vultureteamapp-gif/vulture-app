import {summarizeFleet} from "./ledger.mjs";
export class AgentError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const statuses=new Set(['waiting','loaded','ongoing','completed','cancelled']);
const kinds=new Set(['fuel','urea','toll','meal','repair','wash','supplies','lodging','etc']);
function number(v,label,optional=false){if(v==null&&optional)return undefined;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e9)throw new AgentError('INVALID_'+label);return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw new AgentError('INVALID_DATE');return v;}
const take=(record,keys)=>{if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!keys.includes(k)))throw new AgentError('RECORD_FIELDS_DENIED');return record;};
// Numeric/categorical allowlist. No memo, names, addresses, receipts, auth or original IDs.
export function validateSnapshot(raw){
 take(raw,['schema','actor','dispatches','fuelings','expenses']);
 if(raw.schema!=='vulture-synthetic-v1'||!['synthetic-admin','synthetic-driver'].includes(raw.actor))throw new AgentError('SYNTHETIC_DATA_REQUIRED');
 for(const k of ['dispatches','fuelings','expenses'])if(!Array.isArray(raw[k])||raw[k].length>200)throw new AgentError('INVALID_COLLECTION');
 const dispatches=raw.dispatches.map((item,i)=>{const d=take(item,['id','date','fare','totalFare','status']);if(d.id!=='D'+(i+1)||!statuses.has(d.status))throw new AgentError('INVALID_DISPATCH');return {id:d.id,date:date(d.date),fare:number(d.fare,'FARE'),totalFare:number(d.totalFare,'TOTAL_FARE',true),status:d.status};});
 const fuelings=raw.fuelings.map((item,i)=>{const f=take(item,['id','date','amount','liters','unitPrice']);if(f.id!=='F'+(i+1))throw new AgentError('INVALID_FUEL_ID');return {id:f.id,date:date(f.date),amount:number(f.amount,'FUEL_AMOUNT'),liters:number(f.liters,'LITERS',true),unitPrice:number(f.unitPrice,'UNIT_PRICE',true)};});
 const expenses=raw.expenses.map((item,i)=>{const e=take(item,['id','date','kind','amount','sourceFuelingId']);if(e.id!=='E'+(i+1)||!kinds.has(e.kind)||(e.sourceFuelingId&&!/^F\d+$/.test(e.sourceFuelingId)))throw new AgentError('INVALID_EXPENSE');return {id:e.id,date:date(e.date),kind:e.kind,amount:number(e.amount,'EXPENSE_AMOUNT'),...(e.sourceFuelingId?{sourceFuelingId:e.sourceFuelingId}:{})};});
 return {schema:raw.schema,actor:raw.actor,dispatches,fuelings,expenses,maintenances:[],overloads:[]};
}
export function deterministicReview(data){
 const sum=summarizeFleet(data),findings=[];
 for(const f of data.fuelings){
  if(f.liters!=null&&f.unitPrice!=null&&Math.abs(f.amount-Math.round(f.liters*f.unitPrice))>1)findings.push({code:'FUEL_ARITHMETIC',ids:[f.id],evidence:'총액 '+f.amount+'원, 리터×단가 '+Math.round(f.liters*f.unitPrice)+'원',action:'수동 결제 총액인지 영수증과 확인'});
  if(f.amount<0||(f.liters!=null&&f.liters<=0)||(f.unitPrice!=null&&f.unitPrice<=0))findings.push({code:'FUEL_VALUE',ids:[f.id],evidence:'음수 금액 또는 0 이하의 주유량·단가',action:'입력값 확인'});
 }
 for(const e of data.expenses)if(e.amount<=0)findings.push({code:'EXPENSE_VALUE',ids:[e.id],evidence:'경비 금액 0 이하',action:'영수증 확인'});
 for(const d of data.dispatches)if((d.totalFare??d.fare)<=0)findings.push({code:'FARE_VALUE',ids:[d.id],evidence:'운임 0 이하',action:'계약 운임 확인'});
 for(const w of sum.ledger.warnings)findings.push({code:w.code,ids:w.ids,evidence:w.message,action:'같은 결제인지 확인; 자동 삭제하지 않음'});
 if(sum.profit<0)findings.push({code:'NEGATIVE_PROFIT',ids:[],evidence:'완료 매출보다 지출이 '+Math.abs(sum.profit)+'원 큼',action:'기간·미완료 배차·누락 매출 확인'});
 return {summary:{revenue:sum.revenue,expense:sum.expense,profit:sum.profit,completedCount:sum.completedCount,liters:sum.liters},findings,excluded:sum.ledger.excluded};
}
export function parseModelOutput(text,data){
 if(typeof text!=='string'||text.length>40000)throw new AgentError('MODEL_OUTPUT_INVALID',502);
 let v;try{v=JSON.parse(text.trim());}catch{throw new AgentError('MODEL_OUTPUT_NOT_JSON',502);}
 const str=(x,n)=>{if(typeof x!=='string'||x.length>n)throw new AgentError('MODEL_SCHEMA_INVALID',502);return x;};
 const ids=new Set([...data.dispatches,...data.fuelings,...data.expenses].map(x=>x.id));
 if(!v||!Array.isArray(v.findings)||v.findings.length>12||!Array.isArray(v.nextActions)||v.nextActions.length>8||!Array.isArray(v.limitations)||v.limitations.length>8)throw new AgentError('MODEL_SCHEMA_INVALID',502);
 return {summary:str(v.summary,2000),findings:v.findings.map(f=>{if(!f||!['high','medium','low','review'].includes(f.severity)||!Array.isArray(f.recordIds)||f.recordIds.some(id=>!ids.has(id)))throw new AgentError('MODEL_EVIDENCE_INVALID',502);return {severity:f.severity,recordIds:f.recordIds,issue:str(f.issue,300),evidence:str(f.evidence,1200),recommendation:str(f.recommendation,1200)};}),nextActions:v.nextActions.map(x=>str(x,1000)),limitations:v.limitations.map(x=>str(x,1000))};
}

export const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
