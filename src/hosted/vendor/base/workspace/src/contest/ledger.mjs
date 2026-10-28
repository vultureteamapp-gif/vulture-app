// Shared by calendar, profit screens and the analysis agent. No heuristic data deletion.
export function buildCostLedger(expenses=[],fuelings=[],maintenances=[],overloads=[]){
 const entries=[],excluded=[],warnings=[],money=x=>Number.isFinite(x)?x:0;
 const fuels=new Map(fuelings.map(f=>[f.id,f]));
 for(const e of expenses){
  const linked=e.kind==='fuel'&&e.sourceFuelingId?fuels.get(e.sourceFuelingId):null;
  if(linked&&linked.date===e.date&&linked.amount===e.amount){excluded.push({id:e.id,source:'expense',linkedFuelingId:linked.id,reason:'EXPLICIT_FUEL_LINK'});continue;}
  if(e.sourceFuelingId)warnings.push({code:'FUEL_LINK_INVALID',ids:[e.id],message:'주유 연결이 없거나 날짜·금액이 다릅니다. 임의 제외하지 않았습니다.'});
  const matches=e.kind==='fuel'?fuelings.filter(f=>f.date===e.date&&f.amount===e.amount):[];
  if(matches.length)warnings.push({code:'POSSIBLE_DUPLICATE_FUEL',ids:[e.id,...matches.map(f=>f.id)],message:'동일 날짜·금액의 주유/경비가 있습니다. 같은 결제인지 확인 후 연결하세요.'});
  entries.push({...e,id:'expense:'+e.id,recordId:e.id,source:'expense',amount:money(e.amount)});
 }
 for(const f of fuelings)entries.push({id:'fueling:'+f.id,recordId:f.id,source:'fueling',kind:'fuel',date:f.date,amount:money(f.amount)});
 for(const m of maintenances)entries.push({id:'maintenance:'+m.id,recordId:m.id,source:'maintenance',kind:'repair',date:m.date,amount:money(m.cost)+money(m.laborCost)});
 for(const o of overloads)entries.push({id:'fine:'+o.id,recordId:o.id,source:'fine',kind:'fine',date:o.date,amount:money(o.fineAmount)});
 return {entries,excluded,warnings,total:entries.reduce((s,e)=>s+e.amount,0)};
}
export function summarizeFleet(data){
 const ledger=buildCostLedger(data.expenses,data.fuelings,data.maintenances,data.overloads),completed=data.dispatches.filter(d=>d.status==='completed');
 const revenue=completed.reduce((s,d)=>s+(d.totalFare??d.fare??0),0);
 return {revenue,expense:ledger.total,profit:revenue-ledger.total,completedCount:completed.length,fuelingCount:data.fuelings.length,liters:data.fuelings.reduce((s,f)=>s+(f.liters??0),0),ledger};
}
